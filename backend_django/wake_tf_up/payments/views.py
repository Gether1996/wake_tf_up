from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.http import Http404
from django.shortcuts import get_object_or_404
from urllib.parse import urlencode
from django.conf import settings
from orders.models import Order
from orders.emails import send_payment_confirmation_email
from orders.access import get_guest_order_query_params, has_valid_guest_order_access
from .models import PaymentTransaction
from .reconciliation import apply_gopay_status_to_transaction
from .serializers import (
    PaymentTransactionSerializer,
    CreatePaymentSerializer,
    PaymentStatusSerializer
)
from .gopay_service import GoPayService
import logging

logger = logging.getLogger(__name__)


def get_order_for_payment_request(request, order_id, access_token=None):
    """
    Resolve an order for payment-related endpoints.

    Authenticated users can only access their own orders.
    Guests can only access guest orders.
    """
    if request.user.is_authenticated:
        return get_object_or_404(Order, id=order_id, user=request.user)

    order = get_object_or_404(Order, id=order_id, user__isnull=True)
    if not has_valid_guest_order_access(order, access_token):
        raise Http404
    return order


class CreatePaymentView(generics.CreateAPIView):
    """
    Create a GoPay payment for an order.
    POST /api/v1/payments/create/
    
    Body:
    {
        "order_id": 123
    }
    
    Response:
    {
        "success": true,
        "payment_url": "https://gate.gopay.cz/...",
        "transaction_id": "gopay_id",
        "transaction": {...}
    }
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CreatePaymentSerializer

    def create(self, request, *args, **kwargs):
        logger.info(f"[Payment API] Create payment request from user {getattr(request.user, 'id', 'guest')}")

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data['order_id']
        access_token = serializer.validated_data.get('access_token')
        logger.info(f"[Payment API] Order ID: {order_id}")

        order = get_order_for_payment_request(request, order_id, access_token=access_token)
        logger.debug(f"[Payment API] Order found: #{order.id} | Total: {order.total_amount} EUR | Status: {order.status}")
        
        # Check if order is already paid
        if order.status == 'paid':
            logger.warning(f"[Payment API] Order #{order.id} is already paid")
            return Response(
                {'error': 'Order is already paid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get language from request data, or fall back to order.language (set during order creation)
        language = request.data.get('language') or order.language or 'sk'
        logger.info(f"[Payment API] Language detected: {language}")
        
        if getattr(settings, 'GOPAY_DISABLE_PAYMENTS', False):
            logger.info(f"[Payment API] GOPAY_DISABLE_PAYMENTS=True - simulating payment")
            return self._simulate_payment_success(order, language)
        
        # Check if payment already exists and is pending
        existing_payment = PaymentTransaction.objects.filter(
            order=order,
            status='pending'
        ).first()
        
        if existing_payment:
            logger.info(f"[Payment API] Found existing pending payment: Transaction #{existing_payment.id}")
            # Allow retry if GoPay payment exists but check its current status
            gopay = GoPayService()
            status_result = gopay.check_payment_status(existing_payment.provider_transaction_id)
            
            if status_result.get('success'):
                state = status_result.get('state')
                if state == 'PAID':
                    logger.info(f"[Payment API] Existing payment is already PAID")
                    apply_gopay_status_to_transaction(
                        existing_payment,
                        status_result,
                        source='Payment API Existing Payment',
                    )
                    return Response(
                        {'error': 'Order is already paid'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif state in ['CREATED', 'PAYMENT_METHOD_CHOSEN']:
                    logger.info(f"[Payment API] Existing payment still active (state={state}) - returning existing URL")
                    # Payment is still active, return existing payment URL
                    gopay_response = existing_payment.provider_response or {}
                    return Response({
                        'success': True,
                        'payment_url': gopay_response.get('gw_url'),
                        'transaction_id': existing_payment.provider_transaction_id,
                        'transaction': PaymentTransactionSerializer(existing_payment).data
                    }, status=status.HTTP_200_OK)
                else:
                    logger.warning(f"[Payment API] Existing payment failed/cancelled (state={state}) - will create new payment")
                    # Payment failed/cancelled/timeout - mark as failed and create new one
                    existing_payment.status = 'failed'
                    existing_payment.save()
        
        # Cancel any old failed payments for this order
        PaymentTransaction.objects.filter(
            order=order,
            status__in=['failed', 'pending']
        ).exclude(
            id=existing_payment.id if existing_payment and existing_payment.status != 'failed' else None
        ).update(status='failed')
        
        # Build return and notification URLs using configured backend URL
        # GoPay needs URLs where it can reach the backend API, not frontend
        base_url = settings.GOPAY_CALLBACK_BASE_URL.rstrip('/')
        return_url = f"{base_url}/api/v1/payments/return/?lang={language}"
        notify_url = f"{base_url}/api/v1/payments/notification/"
        
        logger.info(f"[Payment API] Creating new GoPay payment for Order #{order.id}")
        logger.debug(f"[Payment API] Callback base URL: {base_url}")
        logger.debug(f"[Payment API] Return URL: {return_url}")
        
        # Create payment with GoPay
        gopay = GoPayService()
        result = gopay.create_payment(
            order=order,
            return_url=return_url,
            notify_url=notify_url
        )
        
        if result.get('success'):
            logger.info(f"[Payment API] ✓ Payment created successfully - redirecting to: {result.get('payment_url')}")
            return Response({
                'success': True,
                'payment_url': result.get('payment_url'),
                'transaction_id': result.get('transaction_id'),
                'transaction': PaymentTransactionSerializer(result.get('transaction')).data
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"[Payment API] ✗ Payment creation failed: {result.get('error')}")
            return Response(
                {'error': result.get('error', 'Payment creation failed')},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _simulate_payment_success(self, order, language='sk'):
        """Skip real GoPay call and mark the order as paid in test environments."""
        # Close other pending transactions
        PaymentTransaction.objects.filter(order=order, status='pending').update(status='failed')
        
        was_already_paid = order.status == 'paid'
        order.status = 'paid'
        order.save(update_fields=['status'])
        
        # Send payment confirmation email
        if not was_already_paid:
            try:
                logger.info(f"[Payment API] Sending payment confirmation email for order #{order.id} (test mode, language={language})")
                send_payment_confirmation_email(order, language=language)
                logger.info(f"[Payment API] ✓ Payment confirmation email sent successfully")
            except Exception as email_exc:
                logger.error(f"[Payment API] ✗ Failed to send payment confirmation email: {email_exc}", exc_info=True)
        
        transaction = PaymentTransaction.objects.create(
            order=order,
            amount=order.total_amount,
            status='completed',
            payment_method='gopay',
            provider='gopay-test-skip',
            provider_transaction_id=f"TEST-{order.id}",
            provider_response={
                'message': 'Payment skipped - test mode',
                'environment': getattr(settings, 'GOPAY_ENVIRONMENT', 'test')
            }
        )
        
        confirmation_params = {
            'order_id': order.id,
            'status': 'paid',
            'testPayment': 1,
            **get_guest_order_query_params(order),
        }
        confirmation_query = urlencode(confirmation_params)
        confirmation_url = f"{settings.FRONTEND_URL.rstrip('/')}/{language}/order-confirmation?{confirmation_query}"
        
        return Response({
            'success': True,
            'payment_url': confirmation_url,
            'transaction_id': transaction.provider_transaction_id,
            'transaction': PaymentTransactionSerializer(transaction).data,
            'payment_skipped': True
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def payment_return_view(request):
    """
    Handle user return from GoPay after payment.
    GET /api/v1/payments/return/?id=<gopay_transaction_id>
    
    This redirects the user to the frontend with payment status.
    """
    from django.http import HttpResponseRedirect
    from django.conf import settings
    
    gopay_id = request.GET.get('id')
    language = request.GET.get('lang', 'sk')
    
    logger.info(f"[Payment Return] User returned from GoPay, ID: {gopay_id}, Language: {language}")
    
    if not gopay_id:
        # Redirect to home if no payment ID
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://www.wake-tf-up.eu')
        return HttpResponseRedirect(f"{frontend_url}/{language}/shop")
    
    # Check payment status
    gopay = GoPayService()
    result = gopay.check_payment_status(gopay_id)
    
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://www.wake-tf-up.eu')
    
    if result.get('success'):
        state = result.get('state')
        
        # Update transaction status
        try:
            transaction = PaymentTransaction.objects.get(
                provider_transaction_id=str(gopay_id)
            )
            
            if state == 'PAID':
                was_already_paid = transaction.order.status == 'paid'
                from django.db import transaction as db_transaction
                with db_transaction.atomic():
                    transaction.status = 'completed'
                    transaction.order.status = 'paid'
                    transaction.order.save(update_fields=['status'])
                    transaction.provider_response = result.get('data')
                    transaction.save(update_fields=['status', 'provider_response'])
                
                # Send payment confirmation email
                if not was_already_paid:
                    try:
                        # Use order.language (saved during order creation) instead of ?lang= parameter
                        logger.info(f"[Payment Return] Sending payment confirmation email for order #{transaction.order.id} in {transaction.order.language}")
                        send_payment_confirmation_email(transaction.order)  # Will use order.language automatically
                        logger.info(f"[Payment Return] ✓ Payment confirmation email sent successfully")
                    except Exception as email_exc:
                        logger.error(f"[Payment Return] ✗ Failed to send payment confirmation email: {email_exc}", exc_info=True)
            elif state in ['CANCELED', 'TIMEOUTED']:
                transaction.status = 'failed'
                transaction.provider_response = result.get('data')
                transaction.save(update_fields=['status', 'provider_response'])
            else:
                transaction.provider_response = result.get('data')
                transaction.save(update_fields=['provider_response'])
            
            # Redirect to frontend with status and language (use order.language, not query param)
            order_language = getattr(transaction.order, 'language', 'sk')
            confirmation_params = {
                'order_id': transaction.order.id,
                'status': state.lower(),
                **get_guest_order_query_params(transaction.order),
            }
            return HttpResponseRedirect(
                f"{frontend_url}/{order_language}/order-confirmation?{urlencode(confirmation_params)}"
            )
            
        except PaymentTransaction.DoesNotExist:
            logger.error(f"Transaction not found for GoPay ID: {gopay_id}")
            return HttpResponseRedirect(f"{frontend_url}/{language}/order-confirmation?error=transaction_not_found")
    else:
        return HttpResponseRedirect(f"{frontend_url}/{language}/order-confirmation?error=status_check_failed")


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def payment_notification_view(request):
    """
    Handle GoPay payment notification (webhook).
    GET/POST /api/v1/payments/notification/
    
    GoPay sends notifications to this endpoint when payment status changes.
    Accepts both GET (with ?id=xxx in query string) and POST (with id in body).
    """
    # GoPay sends GET with ?id=xxx parameter
    gopay_id = request.GET.get('id') or request.data.get('id')
    
    if not gopay_id:
        logger.error("[GoPay Webhook] Notification received without ID")
        return Response(
            {'error': 'Missing payment ID'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    logger.info(f"[GoPay Webhook] Notification received for GoPay ID: {gopay_id} (method: {request.method})")

    # Verify this payment ID exists in our system before hitting GoPay API
    # This prevents DoS via flooding with fake IDs
    if not PaymentTransaction.objects.filter(provider_transaction_id=str(gopay_id)).exists():
        logger.warning(f"[GoPay Webhook] Unknown payment ID rejected: {gopay_id}")
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    # Process notification
    gopay = GoPayService()
    result = gopay.process_notification(gopay_id)
    
    if result.get('success'):
        logger.info(f"[GoPay Webhook] ✓ Notification processed successfully")
        
        # Get transaction and send payment confirmation email if paid
        # This is a fallback in case gopay_service email sending failed
        try:
            transaction = result.get('transaction')
            if transaction and transaction.order.status == 'paid':
                # Check if we should send email (gopay_service already tries, but this is a safety net)
                logger.info(f"[GoPay Webhook] Order #{transaction.order.id} is paid, ensuring payment confirmation email")
                # The email is sent in gopay_service.py, but we log here for verification
        except Exception as e:
            logger.error(f"[GoPay Webhook] Error in post-notification processing: {e}")
        
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
    else:
        logger.error(f"[GoPay Webhook] ✗ Failed to process notification: {result.get('error')}")
        return Response(
            {'error': result.get('error')},
            status=status.HTTP_400_BAD_REQUEST
        )


class PaymentStatusView(generics.RetrieveAPIView):
    """
    Check payment status by order ID.
    GET /api/v1/payments/status/{order_id}/
    """
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, order_id):
        access_token = request.query_params.get('access_token')
        order = get_order_for_payment_request(request, order_id, access_token=access_token)
        transaction = order.transactions.order_by('-created_at').first()
        if not transaction:
            return Response(
                {'error': 'No payment transaction found for this order'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # If pending, check status with GoPay
        if transaction.status == 'pending':
            gopay = GoPayService()
            result = gopay.check_payment_status(transaction.provider_transaction_id)
            
            if result.get('success'):
                state = result.get('state')
                
                # Update transaction
                if state == 'PAID':
                    was_already_paid = transaction.order.status == 'paid'
                    from django.db import transaction as db_transaction
                    with db_transaction.atomic():
                        transaction.status = 'completed'
                        transaction.order.status = 'paid'
                        transaction.order.save(update_fields=['status'])
                        transaction.provider_response = result.get('data')
                        transaction.save(update_fields=['status', 'provider_response'])
                    
                    # Send payment confirmation email
                    if not was_already_paid:
                        try:
                            # Use order.language (saved during order creation)
                            logger.info(f"[Payment Status] Sending payment confirmation email for order #{transaction.order.id} in {transaction.order.language}")
                            send_payment_confirmation_email(transaction.order)  # Will use order.language automatically
                            logger.info(f"[Payment Status] ✓ Payment confirmation email sent successfully")
                        except Exception as email_exc:
                            logger.error(f"[Payment Status] ✗ Failed to send payment confirmation email: {email_exc}", exc_info=True)
                elif state in ['CANCELED', 'TIMEOUTED']:
                    transaction.status = 'failed'
                    transaction.provider_response = result.get('data')
                    transaction.save(update_fields=['status', 'provider_response'])
                else:
                    transaction.provider_response = result.get('data')
                    transaction.save(update_fields=['provider_response'])
        
        return Response({
            'success': True,
            'transaction': PaymentTransactionSerializer(transaction).data,
            'order_status': order.status
        })
