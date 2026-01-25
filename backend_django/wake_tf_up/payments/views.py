from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.urls import reverse
from orders.models import Order
from .models import PaymentTransaction
from .serializers import (
    PaymentTransactionSerializer,
    CreatePaymentSerializer,
    PaymentStatusSerializer
)
from .gopay_service import GoPayService
import logging

logger = logging.getLogger(__name__)


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
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CreatePaymentSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        order_id = serializer.validated_data['order_id']
        
        # Get order and verify ownership
        order = get_object_or_404(Order, id=order_id, user=request.user)
        
        # Check if order is already paid
        if order.status == 'paid':
            return Response(
                {'error': 'Order is already paid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if payment already exists and is pending
        existing_payment = PaymentTransaction.objects.filter(
            order=order,
            status='pending'
        ).first()
        
        if existing_payment:
            # Allow retry if GoPay payment exists but check its current status
            gopay = GoPayService()
            status_result = gopay.check_payment_status(existing_payment.provider_transaction_id)
            
            if status_result.get('success'):
                state = status_result.get('state')
                if state == 'PAID':
                    existing_payment.status = 'completed'
                    existing_payment.order.status = 'paid'
                    existing_payment.order.save()
                    existing_payment.save()
                    return Response(
                        {'error': 'Order is already paid'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif state in ['CREATED', 'PAYMENT_METHOD_CHOSEN']:
                    # Payment is still active, return existing payment URL
                    gopay_response = existing_payment.provider_response or {}
                    return Response({
                        'success': True,
                        'payment_url': gopay_response.get('gw_url'),
                        'transaction_id': existing_payment.provider_transaction_id,
                        'transaction': PaymentTransactionSerializer(existing_payment).data
                    }, status=status.HTTP_200_OK)
                else:
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
        
        # Build return and notification URLs using configured frontend URL
        from django.conf import settings
        base_url = settings.FRONTEND_URL.rstrip('/')
        return_url = f"{base_url}/api/v1/payments/return/"
        notify_url = f"{base_url}/api/v1/payments/notification/"
        
        # Create payment with GoPay
        gopay = GoPayService()
        result = gopay.create_payment(
            order=order,
            return_url=return_url,
            notify_url=notify_url
        )
        
        if result.get('success'):
            return Response({
                'success': True,
                'payment_url': result.get('payment_url'),
                'transaction_id': result.get('transaction_id'),
                'transaction': PaymentTransactionSerializer(result.get('transaction')).data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': result.get('error', 'Payment creation failed')},
                status=status.HTTP_400_BAD_REQUEST
            )


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
    
    if not gopay_id:
        # Redirect to home if no payment ID
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:4200')
        return HttpResponseRedirect(f"{frontend_url}/en/shop")
    
    # Check payment status
    gopay = GoPayService()
    result = gopay.check_payment_status(gopay_id)
    
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:4200')
    
    if result.get('success'):
        state = result.get('state')
        
        # Update transaction status
        try:
            transaction = PaymentTransaction.objects.get(
                provider_transaction_id=str(gopay_id)
            )
            
            if state == 'PAID':
                transaction.status = 'completed'
                transaction.order.status = 'paid'
                transaction.order.save()
            elif state in ['CANCELED', 'TIMEOUTED']:
                transaction.status = 'failed'
            
            transaction.provider_response = result.get('data')
            transaction.save()
            
            # Redirect to frontend with status - use default language (en)
            return HttpResponseRedirect(
                f"{frontend_url}/en/order-confirmation?order_id={transaction.order.id}&status={state.lower()}"
            )
            
        except PaymentTransaction.DoesNotExist:
            logger.error(f"Transaction not found for GoPay ID: {gopay_id}")
            return HttpResponseRedirect(f"{frontend_url}/en/order-confirmation?error=transaction_not_found")
    else:
        return HttpResponseRedirect(f"{frontend_url}/en/order-confirmation?error=status_check_failed")


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def payment_notification_view(request):
    """
    Handle GoPay payment notification (webhook).
    POST /api/v1/payments/notification/
    
    GoPay sends notifications to this endpoint when payment status changes.
    """
    gopay_id = request.data.get('id')
    
    if not gopay_id:
        logger.error("Payment notification received without ID")
        return Response(
            {'error': 'Missing payment ID'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    logger.info(f"Payment notification received for GoPay ID: {gopay_id}")
    
    # Process notification
    gopay = GoPayService()
    result = gopay.process_notification(gopay_id)
    
    if result.get('success'):
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
    else:
        logger.error(f"Failed to process notification: {result.get('error')}")
        return Response(
            {'error': result.get('error')},
            status=status.HTTP_400_BAD_REQUEST
        )


class PaymentStatusView(generics.RetrieveAPIView):
    """
    Check payment status by order ID.
    GET /api/v1/payments/status/{order_id}/
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def retrieve(self, request, order_id):
        # Get order and verify ownership
        order = get_object_or_404(Order, id=order_id, user=request.user)
        
        # Get latest transaction
        transaction = PaymentTransaction.objects.filter(order=order).order_by('-created_at').first()
        
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
                    transaction.status = 'completed'
                    transaction.order.status = 'paid'
                    transaction.order.save()
                elif state in ['CANCELED', 'TIMEOUTED']:
                    transaction.status = 'failed'
                
                transaction.provider_response = result.get('data')
                transaction.save()
        
        return Response({
            'success': True,
            'transaction': PaymentTransactionSerializer(transaction).data,
            'order_status': order.status
        })
