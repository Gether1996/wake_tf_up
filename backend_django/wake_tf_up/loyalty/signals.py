from django.db.models.signals import post_save
from django.dispatch import receiver
from orders.models import Order
from .models import LoyaltyService
from .tasks import send_loyalty_code_email


@receiver(post_save, sender=Order)
def check_loyalty_eligibility(sender, instance, created, **kwargs):
    """
    Check if user qualifies for loyalty code after order is marked as paid.
    Automatically generates and sends loyalty code via email.
    """
    # Only check when order status changes to 'paid', 'shipped', or 'delivered'
    if instance.status in ['paid', 'shipped', 'delivered']:
        # Check if user qualifies for loyalty code
        code = LoyaltyService.check_and_generate_loyalty_code(instance.user)
        
        # Only send email if this is a freshly generated code (not an existing one)
        if code and getattr(code, '_newly_created', False):
            send_loyalty_code_email(instance.user, code)
