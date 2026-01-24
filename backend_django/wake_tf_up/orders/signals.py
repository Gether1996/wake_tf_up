from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
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
        
        # Prepare email context
        context = {
            'user': instance.user,
            'order': instance,
            'tokens': tokens,
            'base_url': settings.FRONTEND_URL if hasattr(settings, 'FRONTEND_URL') else 'http://localhost:4200'
        }
        
        # Render email
        html_message = render_to_string('orders/review_request_email.html', context)
        plain_message = strip_tags(html_message)
        
        # Send email
        try:
            send_mail(
                subject=f'Ohodnoťte Vašu objednávku #{instance.id}',
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[instance.user.email],
                html_message=html_message,
                fail_silently=False,
            )
        except Exception as e:
            # Log error but don't raise (we don't want to block order updates)
            print(f"Failed to send review request email for order {instance.id}: {e}")
