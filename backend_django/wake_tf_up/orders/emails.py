"""Utility functions for sending order-related emails."""
from decimal import Decimal
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from settings.models import MainSettings
from core.email_utils import get_email_language, send_localized_email

logger = logging.getLogger(__name__)


def send_order_confirmation_email(order, language=None):
    """Send order confirmation email with order summary to the customer.
    
    Args:
        order: Order instance
        language: Language code ('sk' or 'en'). If None, will try to detect from user preferences.
    """
    if order is None or not order.user or not order.user.email:
        logger.warning("Cannot send order confirmation email without user email")
        return

    logger.info("Starting order confirmation email for order %s to %s", order.id, order.user.email)

    items = order.items.select_related("product").all()
    subtotal = Decimal("0.00")
    for item in items:
        line_total = (item.price_at_purchase or Decimal("0")) * item.quantity
        subtotal += line_total

    base_url = getattr(settings, "FRONTEND_URL", "http://localhost:4200").rstrip("/")
    support_email = MainSettings.objects.first().contact_email if MainSettings.objects.exists() else settings.DEFAULT_CONTACT_EMAIL
    sender_email = getattr(settings, "DEFAULT_FROM_EMAIL", support_email)
    
    # Get language from parameter or user preferences
    language_code = language if language else get_email_language(user=order.user)

    logger.debug("Order email config - support_email: %s, base_url: %s, language param: %s, final language: %s", support_email, base_url, language, language_code)

    context = {
        "order": order,
        "user": order.user,
        "items": items,
        "subtotal": subtotal,
        "discount_amount": order.discount_amount,
        "total_amount": order.total_amount,
        "shipping_method_display": order.get_shipping_method_display(),
        "payment_method_display": order.get_payment_method_display(),
        "is_cash_payment": order.payment_method == "cash_on_pickup",
        "packeta_point": order.packeta_point_name,
        "packeta_address": order.packeta_point_address,
        "frontend_order_url": f"{base_url}/{language_code}/orders/{order.id}",
        "support_email": support_email,
        "company_purchase": order.is_company_purchase,
    }

    try:
        logger.info("Attempting to send order confirmation email to %s from %s", order.user.email, sender_email)
        send_localized_email(
            subject_sk=f"Potvrdenie objednávky #{order.id}",
            subject_en=f"Order Confirmation #{order.id}",
            template_path="orders/order_confirmation_email.html",
            context=context,
            recipient_list=[order.user.email],
            language=language_code,
            from_email=sender_email
        )
        logger.info("Sent order confirmation email for order %s", order.id)
    except Exception as exc:
        logger.error("Failed to send order confirmation email for order %s: %s", order.id, exc, exc_info=True)

