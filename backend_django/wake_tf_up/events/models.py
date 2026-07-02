from django.db import models
from django.utils.text import slugify
import os

from core.validators import validate_image_extension, validate_image_file_size


class Event(models.Model):
    """Events with HTML content"""
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200, blank=True)
    content_html = models.TextField(help_text="HTML content")
    excerpt = models.TextField(max_length=500, blank=True, help_text="Short description for list view")
    author = models.CharField(max_length=100, blank=True, help_text="Author name")
    
    # Additional fields for events
    datetime = models.DateTimeField(help_text="Event date and time")
    place = models.CharField(max_length=200, help_text="Event location/venue")
    
    is_published = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'events'
        verbose_name = 'Event'
        verbose_name_plural = 'Eventy'
        ordering = ['-datetime']
        indexes = [
            models.Index(fields=['is_published', 'datetime']),
            models.Index(fields=['slug']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Event.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title


class EventImage(models.Model):
    """Images for use in event posts"""
    title = models.CharField(
        max_length=200,
        help_text="Descriptive title for the image"
    )
    image = models.ImageField(
        upload_to='events/images/%Y/%m/',
        help_text="Upload image",
        validators=[validate_image_extension, validate_image_file_size],
    )
    alt_text = models.CharField(
        max_length=200,
        blank=True,
        help_text="Alternative text for accessibility"
    )
    caption = models.TextField(
        blank=True,
        help_text="Optional caption"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'event_images'
        verbose_name = 'Event obrázok'
        verbose_name_plural = 'Event obrázky'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    @property
    def filename(self):
        """Get just the filename from the full path"""
        return os.path.basename(self.image.name)
