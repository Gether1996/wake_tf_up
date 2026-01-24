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
        
        # If a new code was generated (check if just created), send email
        if code:
            # Check if this is a newly created code
            from datetime import timedelta
            time_diff = abs((code.created_at - instance.updated_at).total_seconds())
            if time_diff < 5:  # If created within last 5 seconds
                send_loyalty_code_email(instance.user, code)
