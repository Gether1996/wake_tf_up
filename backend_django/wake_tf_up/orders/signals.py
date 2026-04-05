import logging
from datetime import datetime

from django.db import IntegrityError
from django.db import transaction as db_transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .models import Order


logger = logging.getLogger(__name__)


@receiver(pre_save, sender=Order)
def track_delivered_status(sender, instance, **kwargs):
    """
    Track when order status changes to `delivered` and set delivered_at timestamp.
    """
    if not instance.pk:
        return

    try:
        old_instance = Order.objects.get(pk=instance.pk)
        if old_instance.status != 'delivered' and instance.status == 'delivered':
            instance.delivered_at = datetime.now()
    except Order.DoesNotExist:
        pass


@receiver(post_save, sender=Order)
def send_review_request_email(sender, instance, created, **kwargs):
    """
    Kept for backwards compatibility.
    Review emails are sent via management command after the configured delay.
    """
    return None


@receiver(post_save, sender=Order)
def generate_ticket_codes_on_payment(sender, instance, created, **kwargs):
    """Generate unique ticket codes and send ticket email when an order becomes paid."""
    if created or instance.status != 'paid':
        return

    from .emails import send_ticket_purchased_email
    from .models import OrderItem, PurchasedTicket, generate_ticket_code

    if PurchasedTicket.objects.filter(order=instance).exists():
        logger.info("Skipping ticket generation for order #%s because tickets already exist", instance.id)
        return

    ticket_items = OrderItem.objects.filter(order=instance, ticket__isnull=False)
    if not ticket_items.exists():
        logger.info("Order #%s has no ticket items, skipping ticket generation", instance.id)
        return

    logger.info("Generating ticket codes for order #%s", instance.id)
    purchased_tickets = []
    for item in ticket_items:
        for _ in range(item.quantity):
            code = generate_ticket_code()
            try:
                purchased_ticket = PurchasedTicket.objects.create(
                    order=instance,
                    ticket=item.ticket,
                    order_item=item,
                    code=code,
                )
            except IntegrityError:
                logger.warning(
                    "Ticket code collision for order #%s / order_item #%s, retrying once",
                    instance.id,
                    item.id,
                )
                purchased_ticket = PurchasedTicket.objects.create(
                    order=instance,
                    ticket=item.ticket,
                    order_item=item,
                    code=generate_ticket_code(),
                )
            purchased_tickets.append(purchased_ticket)

    def _send_ticket_email():
        try:
            logger.info(
                "Sending ticket email for order #%s with %s generated tickets",
                instance.id,
                len(purchased_tickets),
            )
            send_ticket_purchased_email(instance, purchased_tickets)
        except Exception as exc:
            logger.error(
                "Failed to send ticket email for order #%s: %s",
                instance.id,
                exc,
                exc_info=True,
            )

    db_transaction.on_commit(_send_ticket_email)
