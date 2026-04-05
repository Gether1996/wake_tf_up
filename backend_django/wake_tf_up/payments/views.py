import logging
from urllib.parse import urlencode

from django.conf import settings
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from orders.access import get_guest_order_query_params, has_valid_guest_order_access
from orders.emails import send_payment_confirmation_email
from orders.models import Order

from .gopay_service import GoPayService
from .models import PaymentTransaction
from .reconciliation import apply_gopay_status_to_transaction
from .serializers import (
    CreatePaymentSerializer,
    PaymentTransactionSerializer,
)


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
    """

    permission_classes = [permissions.AllowAny]
    serializer_class = CreatePaymentSerializer

    def create(self, request, *args, **kwargs):
        logger.info(
            "[Payment API] Create payment request from user %s",
            getattr(request.user, 'id', 'guest'),
        )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data['order_id']
        access_token = serializer.validated_data.get('access_token')
        logger.info("[Payment API] Order ID: %s", order_id)

        order = get_order_for_payment_request(request, order_id, access_token=access_token)
        logger.info(
            "[Payment API] Order #%s loaded for payment | total=%s EUR | status=%s | guest=%s",
            order.id,
            order.total_amount,
            order.status,
            order.user_id is None,
        )

        if order.status == 'paid':
            logger.warning("[Payment API] Order #%s is already paid", order.id)
            return Response({'error': 'Order is already paid'}, status=status.HTTP_400_BAD_REQUEST)

        language = request.data.get('language') or order.language or 'sk'
        logger.info("[Payment API] Language detected: %s", language)

        if getattr(settings, 'GOPAY_DISABLE_PAYMENTS', False):
            logger.info("[Payment API] GOPAY_DISABLE_PAYMENTS=True - simulating payment")
            return self._simulate_payment_success(order, language)

        existing_payment = (
            PaymentTransaction.objects.filter(order=order, status='pending').first()
        )

        if existing_payment:
            logger.info(
                "[Payment API] Found existing pending payment transaction #%s for order #%s",
                existing_payment.id,
                order.id,
            )
            gopay = GoPayService()
            status_result = gopay.check_payment_status(existing_payment.provider_transaction_id)

            if status_result.get('success'):
                state = status_result.get('state')
                if state == 'PAID':
                    logger.info(
                        "[Payment API] Existing GoPay payment %s is already PAID",
                        existing_payment.provider_transaction_id,
                    )
                    apply_gopay_status_to_transaction(
                        existing_payment,
                        status_result,
                        source='Payment API Existing Payment',
                    )
                    return Response(
                        {'error': 'Order is already paid'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if state in ['CREATED', 'PAYMENT_METHOD_CHOSEN']:
                    logger.info(
                        "[Payment API] Existing payment still active (state=%s), returning current gateway URL",
                        state,
                    )
                    gopay_response = existing_payment.provider_response or {}
                    return Response(
                        {
                            'success': True,
                            'payment_url': gopay_response.get('gw_url'),
                            'transaction_id': existing_payment.provider_transaction_id,
                            'transaction': PaymentTransactionSerializer(existing_payment).data,
                        },
                        status=status.HTTP_200_OK,
                    )

                logger.warning(
                    "[Payment API] Existing payment %s ended in state=%s, marking failed before creating new one",
                    existing_payment.provider_transaction_id,
                    state,
                )
                existing_payment.status = 'failed'
                existing_payment.save(update_fields=['status'])

        PaymentTransaction.objects.filter(
            order=order,
            status__in=['failed', 'pending'],
        ).exclude(
            id=existing_payment.id if existing_payment and existing_payment.status != 'failed' else None
        ).update(status='failed')

        base_url = settings.GOPAY_CALLBACK_BASE_URL.rstrip('/')
        return_url = f"{base_url}/api/v1/payments/return/?lang={language}"
        notify_url = f"{base_url}/api/v1/payments/notification/"

        logger.info("[Payment API] Creating new GoPay payment for order #%s", order.id)
        logger.info("[Payment API] Return URL: %s", return_url)
        logger.info("[Payment API] Notify URL: %s", notify_url)

        gopay = GoPayService()
        result = gopay.create_payment(order=order, return_url=return_url, notify_url=notify_url)

        if result.get('success'):
            logger.info(
                "[Payment API] Payment created successfully for order #%s with provider_id=%s",
                order.id,
                result.get('transaction_id'),
            )
            return Response(
                {
                    'success': True,
                    'payment_url': result.get('payment_url'),
                    'transaction_id': result.get('transaction_id'),
                    'transaction': PaymentTransactionSerializer(result.get('transaction')).data,
                },
                status=status.HTTP_201_CREATED,
            )

        logger.error(
            "[Payment API] Payment creation failed for order #%s: %s",
            order.id,
            result.get('error'),
        )
        return Response(
            {'error': result.get('error', 'Payment creation failed')},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def _simulate_payment_success(self, order, language='sk'):
        """Skip real GoPay call and mark the order as paid in test environments."""
        PaymentTransaction.objects.filter(order=order, status='pending').update(status='failed')

        was_already_paid = order.status == 'paid'
        order.status = 'paid'
        order.save(update_fields=['status'])

        if not was_already_paid:
            try:
                logger.info(
                    "[Payment API] Sending payment confirmation email for order #%s (test mode, language=%s)",
                    order.id,
                    language,
                )
                send_payment_confirmation_email(order, language=language)
                logger.info("[Payment API] Payment confirmation email sent successfully")
            except Exception as email_exc:
                logger.error(
                    "[Payment API] Failed to send payment confirmation email for order #%s: %s",
                    order.id,
                    email_exc,
                    exc_info=True,
                )

        transaction = PaymentTransaction.objects.create(
            order=order,
            amount=order.total_amount,
            status='completed',
            payment_method='gopay',
            provider='gopay-test-skip',
            provider_transaction_id=f"TEST-{order.id}",
            provider_response={
                'message': 'Payment skipped - test mode',
                'environment': getattr(settings, 'GOPAY_ENVIRONMENT', 'test'),
            },
        )

        confirmation_params = {
            'order_id': order.id,
            'status': 'paid',
            'testPayment': 1,
            **get_guest_order_query_params(order),
        }
        confirmation_query = urlencode(confirmation_params)
        confirmation_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}/{language}/order-confirmation?{confirmation_query}"
        )

        return Response(
            {
                'success': True,
                'payment_url': confirmation_url,
                'transaction_id': transaction.provider_transaction_id,
                'transaction': PaymentTransactionSerializer(transaction).data,
                'payment_skipped': True,
            },
            status=status.HTTP_200_OK,
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def payment_return_view(request):
    """
    Handle user return from GoPay after payment.
    GET /api/v1/payments/return/?id=<gopay_transaction_id>
    """
    from django.http import HttpResponseRedirect

    gopay_id = request.GET.get('id')
    language = request.GET.get('lang', 'sk')

    logger.info("[Payment Return] User returned from GoPay, ID=%s, query_lang=%s", gopay_id, language)

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://www.wake-tf-up.eu')
    if not gopay_id:
        return HttpResponseRedirect(f"{frontend_url}/{language}/shop")

    gopay = GoPayService()
    result = gopay.check_payment_status(gopay_id)

    if result.get('success'):
        state = result.get('state')
        try:
            transaction = PaymentTransaction.objects.select_related('order').get(
                provider_transaction_id=str(gopay_id)
            )
            apply_gopay_status_to_transaction(transaction, result, source='Payment Return')
            transaction.refresh_from_db(fields=['status', 'provider_response'])
            transaction.order.refresh_from_db(fields=['status', 'language'])

            order_language = getattr(transaction.order, 'language', 'sk')
            confirmation_params = {
                'order_id': transaction.order.id,
                'status': state.lower(),
                **get_guest_order_query_params(transaction.order),
            }
            redirect_url = (
                f"{frontend_url}/{order_language}/order-confirmation?{urlencode(confirmation_params)}"
            )
            logger.info(
                "[Payment Return] Redirecting order #%s to frontend confirmation with state=%s",
                transaction.order.id,
                state,
            )
            return HttpResponseRedirect(redirect_url)
        except PaymentTransaction.DoesNotExist:
            logger.error("[Payment Return] Transaction not found for GoPay ID: %s", gopay_id)
            return HttpResponseRedirect(
                f"{frontend_url}/{language}/order-confirmation?error=transaction_not_found"
            )

    logger.error("[Payment Return] Status check failed for GoPay ID %s: %s", gopay_id, result.get('error'))
    return HttpResponseRedirect(
        f"{frontend_url}/{language}/order-confirmation?error=status_check_failed"
    )


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def payment_notification_view(request):
    """
    Handle GoPay payment notification (webhook).
    GET/POST /api/v1/payments/notification/
    """
    gopay_id = request.GET.get('id') or request.data.get('id')

    if not gopay_id:
        logger.error("[GoPay Webhook] Notification received without payment ID")
        return Response({'error': 'Missing payment ID'}, status=status.HTTP_400_BAD_REQUEST)

    logger.info(
        "[GoPay Webhook] Notification received for GoPay ID %s via %s",
        gopay_id,
        request.method,
    )

    if not PaymentTransaction.objects.filter(provider_transaction_id=str(gopay_id)).exists():
        logger.warning("[GoPay Webhook] Unknown payment ID rejected: %s", gopay_id)
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    gopay = GoPayService()
    result = gopay.process_notification(gopay_id)

    if result.get('success'):
        transaction = result.get('transaction')
        logger.info(
            "[GoPay Webhook] Notification processed successfully for payment %s | local_transaction=%s | state=%s",
            gopay_id,
            getattr(transaction, 'id', None),
            result.get('state'),
        )
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    logger.error(
        "[GoPay Webhook] Failed to process notification for %s: %s",
        gopay_id,
        result.get('error'),
    )
    return Response({'error': result.get('error')}, status=status.HTTP_400_BAD_REQUEST)


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
                status=status.HTTP_404_NOT_FOUND,
            )

        if transaction.status == 'pending':
            logger.info(
                "[Payment Status] Checking pending transaction #%s for order #%s",
                transaction.id,
                order.id,
            )
            gopay = GoPayService()
            result = gopay.check_payment_status(transaction.provider_transaction_id)

            if result.get('success'):
                apply_gopay_status_to_transaction(
                    transaction,
                    result,
                    source='Payment Status',
                )
                transaction.refresh_from_db(fields=['status', 'provider_response'])
                order.refresh_from_db(fields=['status'])
            else:
                logger.error(
                    "[Payment Status] Failed to fetch GoPay status for transaction #%s: %s",
                    transaction.id,
                    result.get('error'),
                )

        return Response(
            {
                'success': True,
                'transaction': PaymentTransactionSerializer(transaction).data,
                'order_status': order.status,
            }
        )
