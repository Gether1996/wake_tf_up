from django.db.models.signals import post_save
from django.dispatch import receiver
import logging
from orders.models import Order
from .models import LoyaltyService
from .tasks import send_loyalty_code_email


logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order)
def check_loyalty_eligibility(sender, instance, created, **kwargs):
    """
    Check if user qualifies for loyalty code after order is marked as paid.
    Automatically generates and sends loyalty code via email.
    """
    if not instance.user_id:
        return

    if instance.status in ['paid', 'shipped', 'delivered']:
        try:
            code = LoyaltyService.check_and_generate_loyalty_code(instance.user)

            if code and getattr(code, '_newly_created', False):
                send_loyalty_code_email(instance.user, code)
        except Exception as exc:
            logger.error(
                "Loyalty eligibility check failed for order #%s and user %s: %s",
                instance.id,
                instance.user_id,
                exc,
                exc_info=True,
            )
