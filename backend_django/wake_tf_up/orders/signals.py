from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from core.email_utils import get_email_language, send_localized_email
from .models import Order


@receiver(post_save, sender=Order)
def send_review_request_email(sender, instance, created, **kwargs):
    """
    Send review request email when order status changes to 'delivered'.
    """
    # Only send if status is 'delivered' and not a new order
    if not created and instance.status == 'delivered':
        # Check if we already sent review emails for this order
        # (check if tokens already exist)
        from reviews.models import ReviewToken
        
        existing_tokens = ReviewToken.objects.filter(order=instance).exists()
        if existing_tokens:
            # Already sent review request, skip
            return
        
        # Generate review tokens for all products in the order
        tokens = ReviewToken.create_for_order(instance)
        
        if not tokens:
            return
        
        # Get language from user
        language_code = get_email_language(user=instance.user)
        
        # Prepare email context
        context = {
            'user': instance.user,
            'order': instance,
            'tokens': tokens,
            'base_url': settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:4200'
        }
        
        # Send localized email
        try:
            send_localized_email(
                subject_sk=f'Ohodnoťte Vašu objednávku #{instance.id}',
                subject_en=f'Rate Your Order #{instance.id}',
                template_path='orders/review_request_email.html',
                context=context,
                recipient_list=[instance.user.email],
                language=language_code
            )
        except Exception as e:
            # Log error but don't raise (we don't want to block order updates)
            print(f"Failed to send review request email for order {instance.id}: {e}")
