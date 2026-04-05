from django.db import IntegrityError
from django.db import transaction as db_transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from datetime import datetime
from core.email_utils import get_email_language, send_localized_email
from .models import Order
import logging

logger = logging.getLogger(__name__)


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
                instance.delivered_at = datetime.now()
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


@receiver(post_save, sender=Order)
def generate_ticket_codes_on_payment(sender, instance, created, **kwargs):
    """Generate unique ticket codes and send ticket email when an order is paid."""
    if created or instance.status != 'paid':
        return

    from .models import PurchasedTicket, OrderItem, generate_ticket_code

    # Only generate once per order
    if PurchasedTicket.objects.filter(order=instance).exists():
        return

    ticket_items = OrderItem.objects.filter(order=instance, ticket__isnull=False)
    if not ticket_items.exists():
        return

    purchased_tickets = []
    for item in ticket_items:
        for _ in range(item.quantity):
            code = generate_ticket_code()
            try:
                pt = PurchasedTicket.objects.create(
                    order=instance,
                    ticket=item.ticket,
                    order_item=item,
                    code=code,
                )
            except IntegrityError:
                # Extremely unlikely collision — regenerate and retry once
                code = generate_ticket_code()
                pt = PurchasedTicket.objects.create(
                    order=instance,
                    ticket=item.ticket,
                    order_item=item,
                    code=code,
                )
            purchased_tickets.append(pt)

    if purchased_tickets:
        from .emails import send_ticket_purchased_email

        def _send_ticket_email():
            try:
                send_ticket_purchased_email(instance, purchased_tickets)
            except Exception as exc:
                logger.error(
                    "Failed to send ticket email for order #%s: %s", instance.id, exc, exc_info=True
                )

        db_transaction.on_commit(_send_ticket_email)
