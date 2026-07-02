from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
import os
import re
import unicodedata

from core.validators import validate_image_extension, validate_image_file_size

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
    
    # Link to actual discount code
    selected_discount_code = models.ForeignKey(
        'loyalty.DiscountCode',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='newsletter_templates',
        help_text="Vyberte existujúci zľavový kód"
    )
    
    # These fields are auto-filled from selected_discount_code
    discount_code = models.CharField(
        max_length=50,
        blank=True,
        default='',
        help_text="Zľavový kód (vyplní sa automaticky)"
    )
    discount_percentage = models.IntegerField(
        null=True,
        blank=True,
        help_text="Discount percentage (vyplní sa automaticky)"
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
        indexes = [
            # Every newsletter send filters Subscriber.objects.filter(is_active=True)
            models.Index(fields=['is_active'], name='sub_is_active_idx'),
        ]
    
    def __str__(self):
        return self.email


class NewsletterPopupStat(SingletonModel):
    """Track newsletter popup interaction counts - simple statistics only"""
    
    shown_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times popup was shown"
    )
    subscribed_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times users subscribed via popup"
    )
    dismissed_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of times popup was dismissed/closed"
    )
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'newsletter_popup_stats'
        verbose_name = 'Newsletter Popup Štatistika'
        verbose_name_plural = 'Newsletter Popup Štatistiky'
    
    def increment_shown(self):
        """Increment shown counter"""
        self.shown_count += 1
        self.save(update_fields=['shown_count', 'last_updated'])
    
    def increment_subscribed(self):
        """Increment subscribed counter"""
        self.subscribed_count += 1
        self.save(update_fields=['subscribed_count', 'last_updated'])
    
    def increment_dismissed(self):
        """Increment dismissed counter"""
        self.dismissed_count += 1
        self.save(update_fields=['dismissed_count', 'last_updated'])
    
    @property
    def total_interactions(self):
        """Total number of interactions (subscribed + dismissed, excluding shown)"""
        return self.subscribed_count + self.dismissed_count
    
    @property
    def conversion_rate(self):
        """Conversion rate: subscribed / total_interactions * 100"""
        if self.total_interactions > 0:
            return (self.subscribed_count / self.total_interactions) * 100
        return 0
    
    def __str__(self):
        return f"Newsletter Popup Stats (Updated: {self.last_updated.strftime('%Y-%m-%d %H:%M')})"


class NewsletterImage(models.Model):
    """Images for use in newsletter emails"""
    title = models.CharField(
        max_length=200,
        help_text="Descriptive title for the image"
    )
    image = models.ImageField(
        upload_to='newsletter/images/%Y/%m/',
        help_text="Upload image for newsletter",
        validators=[validate_image_extension, validate_image_file_size],
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


class EventsTemplate(SingletonModel):
    """Template for events newsletter emails"""
    subject = models.CharField(
        max_length=200,
        default="Nadchádzajúce eventy pre vás!",
        help_text="Email subject line"
    )
    content_html = models.TextField(
        blank=True,
        default='',
        help_text="HTML šablóna emailu. Dostupné Jinja2 premenné: {{site_url}}, {{unsubscribe_url}}, {{email}}."
    )
    last_sent = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this template was sent"
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'events_newsletter_template'
        verbose_name = 'Eventy šablóna'
        verbose_name_plural = 'Eventy šablóny'

    def clean(self):
        self.subject = clean_unicode_chars(self.subject)
        self.content_html = clean_unicode_chars(self.content_html)

    def __str__(self):
        return f"Events Template: {self.subject}"


class BlogsTemplate(SingletonModel):
    """Template for blog newsletter emails"""
    subject = models.CharField(
        max_length=200,
        default="Nové blogy na webe!",
        help_text="Email subject line"
    )
    content_html = models.TextField(
        blank=True,
        default='',
        help_text="HTML šablóna emailu. Dostupné Jinja2 premenné: {{site_url}}, {{unsubscribe_url}}, {{email}}."
    )
    last_sent = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time this template was sent"
    )
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blogs_newsletter_template'
        verbose_name = 'Blogy šablóna'
        verbose_name_plural = 'Blogy šablóny'

    def clean(self):
        self.subject = clean_unicode_chars(self.subject)
        self.content_html = clean_unicode_chars(self.content_html)

    def __str__(self):
        return f"Blogs Template: {self.subject}"
    
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
