from django.db import models
from django.utils.text import slugify
import os


class BlogPost(models.Model):
    """Blog posts with HTML content"""
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=200, blank=True)
    content_html = models.TextField(help_text="HTML content")
    excerpt = models.TextField(max_length=500, blank=True, help_text="Short description for list view")
    author = models.CharField(max_length=100, blank=True, help_text="Author name")
    
    is_published = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'blog_posts'
        verbose_name = 'Blog Post'
        verbose_name_plural = 'Blog Posts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_published', 'created_at']),
            models.Index(fields=['slug']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while BlogPost.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title


class BlogImage(models.Model):
    """Images for use in blog posts"""
    title = models.CharField(
        max_length=200,
        help_text="Descriptive title for the image"
    )
    image = models.ImageField(
        upload_to='blog/images/%Y/%m/',
        help_text="Upload image"
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
        db_table = 'blog_images'
        verbose_name = 'Blog Image'
        verbose_name_plural = 'Blog Images'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    @property
    def filename(self):
        """Get just the filename from the full path"""
        return os.path.basename(self.image.name)
