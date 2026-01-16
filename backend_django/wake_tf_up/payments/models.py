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
    
    # Payment provider details
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
        verbose_name = 'Payment Transaction'
        verbose_name_plural = 'Payment Transactions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Transaction #{self.id} - {self.order} - {self.status}"


# Payment Provider Interface (stub)
class PaymentProviderInterface:
    """
    Abstract interface for payment providers.
    Implement this for GoPay or other payment gateways.
    """
    
    def create_payment(self, order, return_url, notify_url):
        """
        Create a payment request with the provider.
        
        Args:
            order: Order instance
            return_url: URL to return user after payment
            notify_url: URL for payment notifications/webhooks
            
        Returns:
            dict: Payment details including payment URL
        """
        raise NotImplementedError("Subclasses must implement create_payment")
    
    def check_payment_status(self, transaction_id):
        """
        Check payment status with the provider.
        
        Args:
            transaction_id: Provider's transaction ID
            
        Returns:
            dict: Payment status information
        """
        raise NotImplementedError("Subclasses must implement check_payment_status")
    
    def refund_payment(self, transaction_id, amount):
        """
        Request a refund from the provider.
        
        Args:
            transaction_id: Provider's transaction ID
            amount: Amount to refund
            
        Returns:
            dict: Refund status information
        """
        raise NotImplementedError("Subclasses must implement refund_payment")


class GoPayProvider(PaymentProviderInterface):
    """
    GoPay payment provider implementation stub.
    TODO: Implement actual GoPay API integration.
    """
    
    def __init__(self):
        # TODO: Initialize with GoPay credentials
        self.api_url = "https://gate.gopay.cz/api"
        self.client_id = None  # Load from settings
        self.client_secret = None  # Load from settings
    
    def create_payment(self, order, return_url, notify_url):
        """
        TODO: Implement GoPay payment creation
        
        Reference: GoPay API documentation
        - Create payment session
        - Get payment URL
        - Store transaction details
        """
        # Stub implementation
        return {
            'payment_url': 'https://gate.gopay.cz/payment/...',
            'transaction_id': 'stub_transaction_id',
            'status': 'pending'
        }
    
    def check_payment_status(self, transaction_id):
        """TODO: Implement payment status check"""
        return {'status': 'pending'}
    
    def refund_payment(self, transaction_id, amount):
        """TODO: Implement refund logic"""
        return {'status': 'refunded'}
