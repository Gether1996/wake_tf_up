from django.db import models
from django.core.exceptions import ValidationError
from django.conf import settings as django_settings


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
    
    # Shipping Method Costs
    pickup_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text="Personal pickup cost (EUR) - usually 0"
    )
    dpd_courier_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5.99,
        help_text="DPD courier delivery cost (EUR)"
    )
    packeta_box_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=3.99,
        help_text="Packeta box (Z-BOX) delivery cost (EUR)"
    )
    packeta_courier_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=4.99,
        help_text="Packeta courier delivery cost (EUR)"
    )
    
    # Legacy field - kept for backwards compatibility, can be removed later
    standard_shipping_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=5.99,
        help_text="Standard shipping cost (EUR) - DEPRECATED"
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
    owner_name = models.CharField(
        max_length=200,
        default="Patrik Bielčik",
        help_text="Owner/Operator name"
    )
    company_id = models.CharField(
        max_length=50,
        default="56698585",
        help_text="Company registration ID (IČO)"
    )
    tax_id = models.CharField(
        max_length=50,
        default="1127876057",
        help_text="Tax ID (DIČ)"
    )
    contact_email = models.EmailField(
        default=django_settings.DEFAULT_CONTACT_EMAIL,
        help_text="Main contact email"
    )
    orders_email = models.EmailField(
        default="orders@wake-tf-up.eu",
        help_text="Orders contact email"
    )
    phone = models.CharField(
        max_length=20,
        default="+421 917 207 760",
        help_text="Contact phone number"
    )
    address = models.CharField(
        max_length=255,
        default="Jedľová 319/33, 010 04 Žilina",
        help_text="Company address"
    )
    country = models.CharField(
        max_length=100,
        default="Slovakia",
        help_text="Country name"
    )
    
    # Social Media
    instagram_url = models.URLField(blank=True, help_text="Instagram profile URL")
    facebook_url = models.URLField(blank=True, help_text="Facebook page URL")
    twitter_url = models.URLField(blank=True, help_text="Twitter profile URL")
    tiktok_url = models.URLField(blank=True, help_text="TikTok profile URL", default="https://www.tiktok.com/@waketfup_eu")
    
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
    
    # Newsletter Popup Settings
    newsletter_popup_delay = models.PositiveIntegerField(
        default=5,
        null=True,
        blank=True,
        help_text="Minutes before showing newsletter popup (default: 5)"
    )
    newsletter_popup_enabled = models.BooleanField(
        default=True,
        null=True,
        blank=True,
        help_text="Enable automatic newsletter popup"
    )
    
    # Review Email Settings
    review_email_days_after_delivery = models.PositiveIntegerField(
        default=7,
        help_text="Number of days after delivery to send review request email (default: 7)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'main_settings'
        verbose_name = 'Hlavné nastavenia'
        verbose_name_plural = 'Hlavné nastavenia'
    
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

    @classmethod
    def get_contact_email(cls):
        """Return configured contact email with settings fallback"""
        settings = cls.get_settings()
        return settings.contact_email or django_settings.DEFAULT_CONTACT_EMAIL
    
    def __str__(self):
        return f"Main Settings (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"
