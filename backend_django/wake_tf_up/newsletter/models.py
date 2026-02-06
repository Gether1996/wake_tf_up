from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import os
import re
import unicodedata

User = get_user_model()


def clean_unicode_chars(text):
    """Remove ONLY problematic bidirectional/format control characters, keep Slovak chars"""
    if not text:
        return text
    
    # Remove ONLY bidirectional control characters that cause encoding errors
    # Keep all Slovak characters (á, š, č, ď, etc.) and standard Unicode
    # Remove: LRE, RLE, PDF, LRO, RLO, LRI, RLI, FSI, PDI
    cleaned = re.sub(r'[\u202A-\u202E\u2066-\u2069]', '', text)
    return cleaned


class SingletonModel(models.Model):
    """Abstract base class for models that should only have one instance"""
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        pass
    
    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


class NewsletterTemplate(SingletonModel):
    """Template for newsletter announcements/news"""
    subject = models.CharField(
        max_length=200,
        default="Novinky z nášho obchodu",
        help_text="Email subject line"
    )
    content_html = models.TextField(
        blank=True,
        default='',
        help_text="HTML šablóna emailu. Dostupné Jinja2 premenné: {{site_url}}, {{unsubscribe_url}}, {{email}}. Príklady: <a href=\"{{site_url}}/produkty\">Produkty</a>, <a href=\"{{unsubscribe_url}}\">Odhlásiť sa</a>"
    )
    last_sent = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this template was sent"
    )
    
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'newsletter_template'
        verbose_name = 'Novinky šablóna'
        verbose_name_plural = 'Novinky šablóny'
    
    def clean(self):
        """Clean text fields before saving to prevent encoding issues"""
        self.subject = clean_unicode_chars(self.subject)
        self.content_html = clean_unicode_chars(self.content_html)
    
    def __str__(self):
        return f"Newsletter Template: {self.subject}"


class DiscountCodeTemplate(SingletonModel):
    """Template for discount code announcements"""
    subject = models.CharField(
        max_length=200,
        default="Špeciálna zľava len pre vás!",
        help_text="Email subject line"
    )
    content_html = models.TextField(
        blank=True,
        default='',
        help_text="HTML šablóna emailu. Dostupné Jinja2 premenné: {{site_url}}, {{unsubscribe_url}}, {{discount_code}}, {{discount_percentage}}, {{valid_until}}, {{email}}. Príklady: <a href=\"{{site_url}}/produkty\">Produkty</a>, <a href=\"{{unsubscribe_url}}\">Odhlásiť sa</a>"
    )
    discount_code = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text="Zľavový kód, ktorý sa vloží do emailu"
    )
    discount_percentage = models.IntegerField(
        null=True,
        blank=True,
        help_text="Discount percentage (e.g., 10 for 10%)"
    )
    valid_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the discount code expires"
    )
    last_sent = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this template was sent"
    )
    
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'discount_code_template'
        verbose_name = 'Zľavový kód šablóna'
        verbose_name_plural = 'Zľavové kódy šablóny'
    
    def clean(self):
        """Clean text fields before saving to prevent encoding issues"""
        self.subject = clean_unicode_chars(self.subject)
        self.content_html = clean_unicode_chars(self.content_html)
        self.discount_code = clean_unicode_chars(self.discount_code)
    
    def __str__(self):
        return f"Zľavový kód šablóna: {self.subject}"


class Subscriber(models.Model):
    """Newsletter subscriber model"""
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'newsletter_subscribers'
        verbose_name = 'Odberateľ'
        verbose_name_plural = 'Odberatelia'
        ordering = ['-subscribed_at']
    
    def __str__(self):
        return self.email


class NewsletterPopupStat(models.Model):
    """Track newsletter popup interactions for analytics"""
    ACTION_CHOICES = [
        ('subscribed', 'Subscribed'),
        ('dismissed', 'Dismissed/Closed'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="User who interacted (if logged in)"
    )
    session_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        default='',
        help_text="Session identifier for anonymous users"
    )
    email = models.EmailField(
        null=True,
        blank=True,
        help_text="Email if user subscribed"
    )
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        null=True,
        blank=True,
        default='dismissed',
        help_text="What the user did with the popup"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="User's IP address"
    )
    user_agent = models.TextField(
        blank=True,
        default='',
        help_text="Browser user agent string"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'newsletter_popup_stats'
        verbose_name = 'Newsletter Štatistika'
        verbose_name_plural = 'Newsletter Štatistiky'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['action']),
            models.Index(fields=['session_id']),
        ]
    
    def __str__(self):
        if self.email:
            user_info = self.email
        elif self.user:
            user_info = str(self.user)
        elif self.session_id:
            user_info = f"Session: {self.session_id[:8]}"
        else:
            user_info = "Anonymous"
        return f"{user_info} - {self.action} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class NewsletterImage(models.Model):
    """Images for use in newsletter emails"""
    title = models.CharField(
        max_length=200,
        help_text="Descriptive title for the image"
    )
    image = models.ImageField(
        upload_to='newsletter/images/%Y/%m/',
        help_text="Upload image for newsletter"
    )
    alt_text = models.CharField(
        max_length=200,
        blank=True,
        help_text="Alternative text for accessibility"
    )
    caption = models.TextField(
        blank=True,
        help_text="Optional caption or description"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'newsletter_images'
        verbose_name = 'Obrázok'
        verbose_name_plural = 'Obrázky'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    @property
    def filename(self):
        """Get just the filename from the full path"""
        return os.path.basename(self.image.name)
    
    def get_absolute_url(self):
        """Get the full URL for use in emails"""
        from django.conf import settings
        if self.image:
            # This will need to be combined with your domain in production
            return f"{settings.MEDIA_URL}{self.image.name}"
        return ""
