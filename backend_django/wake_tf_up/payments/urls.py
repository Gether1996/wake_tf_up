from django.urls import path
from .views import (
    CreatePaymentView,
    payment_return_view,
    payment_notification_view,
    PaymentStatusView
)

app_name = 'payments'

urlpatterns = [
    # Create payment for order
    path('create/', CreatePaymentView.as_view(), name='create-payment'),
    
    # User return from GoPay
    path('return/', payment_return_view, name='payment-return'),
    
    # GoPay webhook notification
    path('notification/', payment_notification_view, name='payment-notification'),
    
    # Check payment status
    path('status/<int:order_id>/', PaymentStatusView.as_view(), name='payment-status'),
]
