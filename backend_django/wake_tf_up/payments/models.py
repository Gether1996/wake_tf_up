from django.db import models
from django.conf import settings
from orders.models import Order


class PaymentTransaction(models.Model):
    """
    Payment transaction model - stub for future GoPay integration.
    This tracks all payment attempts and their statuses.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('gopay', 'GoPay Online Payment'),
        ('cash_on_pickup', 'Cash on Personal Pickup'),
    ]
    
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Payment method and provider details
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='gopay',
        help_text="Payment method chosen by customer"
    )
    provider = models.CharField(
        max_length=50,
        default='gopay',
        help_text="Payment provider name"
    )
    provider_transaction_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="External transaction ID from payment provider"
    )
    provider_response = models.JSONField(
        blank=True,
        null=True,
        help_text="Full response from payment provider"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payment_transactions'
        verbose_name = 'Platobná transakcia'
        verbose_name_plural = 'Platobné transakcie'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Transaction #{self.id} - {self.order} - {self.status}"


# GoPay Payment States
GOPAY_STATES = {
    'CREATED': 'pending',
    'PAYMENT_METHOD_CHOSEN': 'pending',
    'PAID': 'completed',
    'AUTHORIZED': 'completed',
    'CANCELED': 'failed',
    'TIMEOUTED': 'failed',
    'REFUNDED': 'refunded',
    'PARTIALLY_REFUNDED': 'refunded',
}

# Note: GoPay service implementation is in gopay_service.py
