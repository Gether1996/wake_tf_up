from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import datetime, timedelta
import secrets
from shop.models import Product


class Review(models.Model):
    """Product reviews - only for users who purchased the product"""
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5"
    )
    text = models.TextField()
    
    # Optional reviewer name (for display, can be anonymous)
    reviewer_name = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="Name to display with review (optional)"
    )
    is_anonymous = models.BooleanField(
        default=False,
        help_text="If true, reviewer name will not be shown"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reviews'
        verbose_name = 'Recenzia'
        verbose_name_plural = 'Recenzie'
        ordering = ['-created_at']
        unique_together = ['product', 'user']  # One review per user per product
        indexes = [
            models.Index(fields=['product', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.product.name} ({self.rating}/5)"
    
    def get_display_name(self):
        """Get the name to display for this review"""
        if self.is_anonymous:
            return "Anonymný zákazník"
        if self.reviewer_name:
            return self.reviewer_name
        if self.user.first_name:
            return self.user.first_name
        return self.user.email.split('@')[0]
    
    def clean(self):
        """Validate that user has purchased this product"""
        from django.core.exceptions import ValidationError
        from orders.models import OrderItem, Order
        
        # Check if user has a paid order with this product
        has_purchased = OrderItem.objects.filter(
            order__user=self.user,
            order__status__in=['paid', 'shipped', 'delivered'],
            product=self.product
        ).exists()
        
        if not has_purchased:
            raise ValidationError(
                "You can only review products you have purchased."
            )
    
    def save(self, *args, **kwargs):
        # Skip validation if explicitly requested (for token-based reviews)
        skip_validation = kwargs.pop('skip_validation', False)
        if not skip_validation:
            self.clean()
        super().save(*args, **kwargs)


class ReviewToken(models.Model):
    """Tokens for email-based review submission (allows anonymous reviews via link)"""
    token = models.CharField(max_length=64, unique=True, db_index=True)
    order = models.ForeignKey(
        'orders.Order',
        on_delete=models.CASCADE,
        related_name='review_tokens'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='review_tokens'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='review_tokens'
    )
    
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'review_tokens'
        verbose_name = 'Token recenzie'
        verbose_name_plural = 'Tokeny recenzii'
        ordering = ['-created_at']
        unique_together = ['order', 'product']  # One token per product per order
        indexes = [
            models.Index(fields=['token', 'is_used']),
            models.Index(fields=['expires_at']),
        ]
    
    def __str__(self):
        return f"ReviewToken for {self.user.email} - {self.product.name}"
    
    @classmethod
    def generate_token(cls):
        """Generate a secure random token"""
        return secrets.token_urlsafe(32)
    
    @classmethod
    def create_for_order(cls, order, expiration_days=30):
        """
        Create review tokens for all products in an order.
        
        Args:
            order: Order instance
            expiration_days: Number of days until token expires (default 30)
            
        Returns:
            List of ReviewToken instances
        """
        from orders.models import OrderItem
        
        # Guest orders have no user — skip review tokens
        if not order.user:
            return []

        tokens = []
        expires_at = datetime.now() + timedelta(days=expiration_days)
        
        # Get all unique products from order
        order_items = OrderItem.objects.filter(order=order).select_related('product')
        
        for item in order_items:
            # Skip ticket items — reviews are only for physical products
            if item.product is None:
                continue
            # Check if token already exists for this order+product
            token_obj, created = cls.objects.get_or_create(
                order=order,
                product=item.product,
                user=order.user,
                defaults={
                    'token': cls.generate_token(),
                    'expires_at': expires_at
                }
            )
            tokens.append(token_obj)
        
        return tokens
    
    def is_valid(self):
        """Check if token is still valid (not used and not expired)"""
        return not self.is_used and datetime.now() < self.expires_at
    
    def mark_used(self):
        """Mark token as used"""
        self.is_used = True
        self.used_at = datetime.now()
        self.save(update_fields=['is_used', 'used_at'])
