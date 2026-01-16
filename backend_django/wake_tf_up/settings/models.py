from django.db import models
from django.core.exceptions import ValidationError


class MainSettings(models.Model):
    """
    Main application settings - should only have one instance.
    All configurable values that were previously hardcoded.
    """
    # Shipping Settings
    free_shipping_threshold = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=50.00,
        help_text="Minimum cart value for free shipping (EUR)"
    )
    standard_shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5.99,
        help_text="Standard shipping cost (EUR)"
    )
    
    # Tax Settings
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.00,
        help_text="Tax rate percentage (e.g., 20 for 20%)"
    )
    
    # General Settings
    site_name = models.CharField(
        max_length=200,
        default="Wake TF Up",
        help_text="Site name displayed in emails and frontend"
    )
    contact_email = models.EmailField(
        default="info@waketfup.com",
        help_text="Main contact email"
    )
    
    # Social Media
    instagram_url = models.URLField(blank=True, help_text="Instagram profile URL")
    facebook_url = models.URLField(blank=True, help_text="Facebook page URL")
    twitter_url = models.URLField(blank=True, help_text="Twitter profile URL")
    
    # Cart Settings
    max_cart_quantity = models.PositiveIntegerField(
        default=10,
        help_text="Maximum quantity per product in cart"
    )
    
    # Maintenance
    maintenance_mode = models.BooleanField(
        default=False,
        help_text="Enable maintenance mode (show maintenance page)"
    )
    maintenance_message = models.TextField(
        blank=True,
        help_text="Message to display during maintenance"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'main_settings'
        verbose_name = 'Main Settings'
        verbose_name_plural = 'Main Settings'
    
    def clean(self):
        """Ensure only one instance exists"""
        if MainSettings.objects.exists() and not self.pk:
            raise ValidationError("Only one MainSettings instance is allowed.")
    
    def save(self, *args, **kwargs):
        self.pk = 1  # Force single instance
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the settings instance"""
        settings, created = cls.objects.get_or_create(pk=1)
        return settings
    
    def __str__(self):
        return f"Main Settings (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"
