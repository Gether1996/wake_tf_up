from django.db import models, transaction
from django.conf import settings
from shop.models import Product


class ProductEventStat(models.Model):
    """Aggregated analytics for product events (views, clicks)"""
    EVENT_TYPES = [
        ('view', 'Product View'),
        ('click', 'Product Click'),
    ]
    
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='event_stats'
    )
    event_type = models.CharField(
        max_length=20,
        choices=EVENT_TYPES,
        default='view'
    )
    count = models.IntegerField(
        default=0,
        help_text="Total count of this event type"
    )
    first_recorded_at = models.DateTimeField(auto_now_add=True)
    last_recorded_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'product_event_stats'
        verbose_name = 'Štatistika udalosti produktu'
        verbose_name_plural = 'Štatistiky udalostí produktu'
        ordering = ['-last_recorded_at']
        unique_together = ['product', 'event_type']
        indexes = [
            models.Index(fields=['product', 'event_type']),
            models.Index(fields=['-count']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.event_type}: {self.count}"
    
    @classmethod
    @transaction.atomic
    def record_event(cls, product, event_type):
        """
        Record a product event by incrementing the counter.
        
        Args:
            product: Product instance
            event_type: 'view' or 'click'
        """
        stat, created = cls.objects.select_for_update().get_or_create(
            product=product,
            event_type=event_type
        )
        stat.count += 1
        stat.save(update_fields=['count', 'last_recorded_at'])
        return stat


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
        verbose_name = 'Udalosť produktu'
        verbose_name_plural = 'Udalosti produktu'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
        ]
    
    def save(self, *args, **kwargs):
        """When event is recorded, increment the StatStat counter"""
        # Record to aggregated stats
        ProductEventStat.record_event(self.product, self.event_type)
        super().save(*args, **kwargs)
    
    def __str__(self):
        user_str = self.user.email if self.user else f"session:{self.session_id}"
        return f"{self.event_type} - {self.product.name} by {user_str}"
