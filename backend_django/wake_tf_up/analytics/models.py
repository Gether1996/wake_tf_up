from django.db import models
from django.conf import settings
from shop.models import Product


class ProductEvent(models.Model):
    """Track product view events and clicks"""
    EVENT_TYPES = [
        ('view', 'Product View'),
        ('click', 'Product Click'),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='events'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='product_events',
        help_text="Logged in user (optional)"
    )
    session_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="Anonymous session ID"
    )
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPES,
        default='view'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'product_events'
        verbose_name = 'Product Event'
        verbose_name_plural = 'Product Events'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
        ]
    
    def __str__(self):
        user_str = self.user.email if self.user else f"session:{self.session_id}"
        return f"{self.event_type} - {self.product.name} by {user_str}"
