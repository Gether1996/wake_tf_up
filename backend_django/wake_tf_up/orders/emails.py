"""Utility functions for sending order-related emails."""
from decimal import Decimal
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_order_confirmation_email(order):
    """Send order confirmation email with order summary to the customer."""
    if order is None or not order.user or not order.user.email:
        logger.warning("Cannot send order confirmation email without user email")
        return

    items = order.items.select_related("product").all()
    subtotal = Decimal("0.00")
    for item in items:
        line_total = (item.price_at_purchase or Decimal("0")) * item.quantity
        subtotal += line_total

    base_url = getattr(settings, "FRONTEND_URL", "http://localhost:4200").rstrip("/")
    support_email = getattr(settings, "DEFAULT_FROM_EMAIL", "support@example.com")

    context = {
        "order": order,
        "user": order.user,
        "items": items,
        "subtotal": subtotal,
        "discount_amount": order.discount_amount,
        "total_amount": order.total_amount,
        "shipping_method_display": order.get_shipping_method_display(),
        "packeta_point": order.packeta_point_name,
        "packeta_address": order.packeta_point_address,
        "frontend_order_url": f"{base_url}/en/orders/{order.id}",
        "support_email": support_email,
        "company_purchase": order.is_company_purchase,
    }

    try:
        html_message = render_to_string("orders/order_confirmation_email.html", context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=f"Potvrdenie objednávky #{order.id}",
            message=plain_message,
            from_email=support_email,
            recipient_list=[order.user.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info("Sent order confirmation email for order %s", order.id)
    except Exception as exc:
        logger.error("Failed to send order confirmation email for order %s: %s", order.id, exc)
