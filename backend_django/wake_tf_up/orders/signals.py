from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from core.email_utils import get_email_language, send_localized_email
from .models import Order


@receiver(pre_save, sender=Order)
def track_delivered_status(sender, instance, **kwargs):
    """
    Track when order status changes to 'delivered' and set delivered_at timestamp.
    """
    if instance.pk:  # Only for existing orders
        try:
            old_instance = Order.objects.get(pk=instance.pk)
            # If status changed from non-delivered to delivered
            if old_instance.status != 'delivered' and instance.status == 'delivered':
                instance.delivered_at = timezone.now()
        except Order.DoesNotExist:
            pass


@receiver(post_save, sender=Order)
def send_review_request_email(sender, instance, created, **kwargs):
    """
    This signal is kept for backwards compatibility but review emails
    are now sent via management command after configured delay.
    The command 'send_review_requests' should be run periodically (e.g., daily cron job).
    """
    pass
