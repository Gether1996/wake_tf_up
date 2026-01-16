from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'reviews'
        verbose_name = 'Review'
        verbose_name_plural = 'Reviews'
        ordering = ['-created_at']
        unique_together = ['product', 'user']  # One review per user per product
        indexes = [
            models.Index(fields=['product', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.product.name} ({self.rating}/5)"
    
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
        self.clean()
        super().save(*args, **kwargs)
