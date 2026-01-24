from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Subscriber(models.Model):
    """Newsletter subscriber model"""
    email = models.EmailField(unique=True)
    is_active = models.BooleanField(default=True)
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'newsletter_subscribers'
        verbose_name = 'Newsletter Subscriber'
        verbose_name_plural = 'Newsletter Subscribers'
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
        verbose_name = 'Newsletter Popup Statistic'
        verbose_name_plural = 'Newsletter Popup Statistics'
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
