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
    recipient_email = order.email or (order.user.email if order.user else None)
    if order is None or not recipient_email:
        logger.warning("Cannot send order confirmation email without email (order #%s)", getattr(order, 'id', '?'))
        return

    logger.info("Starting order confirmation email for order %s to %s", order.id, recipient_email)

    items = order.items.select_related("product").all()
    subtotal = Decimal("0.00")
    for item in items:
        line_total = (item.price_at_purchase or Decimal("0")) * item.quantity
        subtotal += line_total

    base_url = getattr(settings, "FRONTEND_URL", "http://www.wake-tf-up.eu").rstrip("/")
    settings_obj = MainSettings.objects.first()
    support_email = settings_obj.contact_email if settings_obj else settings.DEFAULT_CONTACT_EMAIL
    orders_email = settings_obj.orders_email if settings_obj else None
    sender_email = getattr(settings, "DEFAULT_FROM_EMAIL", support_email)
    
    # Get language from parameter or user preferences
    language_code = language if language else (get_email_language(user=order.user) if order.user else 'sk')

    logger.debug("Order email config - support_email: %s, base_url: %s, language param: %s, final language: %s", support_email, base_url, language, language_code)

    context = {
        "order": order,
        "user": order.user,
        "items": items,
        "subtotal": subtotal,
        "shipping_cost": order.shipping_cost,
        "discount_amount": order.discount_amount,
        "total_amount": order.total_amount,
        "shipping_method_display": order.get_shipping_method_display(),
        "payment_method_display": order.get_payment_method_display(),
        "is_cash_payment": order.payment_method == "cash_on_pickup",
        "packeta_point": order.packeta_point_name,
        "packeta_address": order.packeta_point_address,
        "frontend_order_url": f"{base_url}/{language_code}/orders/{order.id}",
        "frontend_base_url": base_url,
        "support_email": support_email,
        "company_purchase": order.is_company_purchase,
    }

    try:
        logger.info("Attempting to send order confirmation email to %s from %s", recipient_email, sender_email)
        
        # Send to customer and orders email (if configured)
        recipient_list = [recipient_email]
        if orders_email:
            recipient_list.append(orders_email)
            logger.info("Also sending order confirmation to orders email: %s", orders_email)
        
        send_localized_email(
            subject_sk=f"Potvrdenie objednávky #{order.id}",
            subject_en=f"Order Confirmation #{order.id}",
            template_path="orders/order_confirmation_email.html",
            context=context,
            recipient_list=recipient_list,
            language=language_code,
            from_email=sender_email
        )
        logger.info("Sent order confirmation email for order %s", order.id)
    except Exception as exc:
        logger.error("Failed to send order confirmation email for order %s: %s", order.id, exc, exc_info=True)


def send_payment_confirmation_email(order, language=None):
    """Send payment confirmation email after successful payment.
    
    Args:
        order: Order instance
        language: Language code ('sk' or 'en'). If None, will use order.language or detect from user.
    """
    recipient_email = order.email or (order.user.email if order.user else None)
    if order is None or not recipient_email:
        logger.warning("Cannot send payment confirmation email without email (order #%s)", getattr(order, 'id', '?'))
        return

    logger.info("Starting payment confirmation email for order %s to %s", order.id, recipient_email)

    items = order.items.select_related("product").all()
    subtotal = Decimal("0.00")
    for item in items:
        line_total = (item.price_at_purchase or Decimal("0")) * item.quantity
        subtotal += line_total

    base_url = getattr(settings, "FRONTEND_URL", "http://www.wake-tf-up.eu").rstrip("/")
    support_email = MainSettings.objects.first().contact_email if MainSettings.objects.exists() else settings.DEFAULT_CONTACT_EMAIL
    sender_email = getattr(settings, "DEFAULT_FROM_EMAIL", support_email)
    
    # Get language: 1) from parameter, 2) from order.language, 3) from user preferences
    language_code = language if language else (order.language if hasattr(order, 'language') and order.language else (get_email_language(user=order.user) if order.user else 'sk'))

    logger.debug("Payment email config - support_email: %s, base_url: %s, language param: %s, final language: %s", support_email, base_url, language, language_code)

    context = {
        "order": order,
        "user": order.user,
        "items": items,
        "subtotal": subtotal,
        "shipping_cost": order.shipping_cost,
        "discount_amount": order.discount_amount,
        "total_amount": order.total_amount,
        "shipping_method_display": order.get_shipping_method_display(),
        "payment_method_display": order.get_payment_method_display(),
        "packeta_point": order.packeta_point_name,
        "packeta_address": order.packeta_point_address,
        "frontend_order_url": f"{base_url}/{language_code}/orders/{order.id}",
        "frontend_base_url": base_url,
        "support_email": support_email,
        "company_purchase": order.is_company_purchase,
    }

    try:
        logger.info("Attempting to send payment confirmation email to %s from %s", recipient_email, sender_email)
        send_localized_email(
            subject_sk=f"Platba prijatá - Objednávka #{order.id}",
            subject_en=f"Payment Received - Order #{order.id}",
            template_path="orders/payment_confirmation_email.html",
            context=context,
            recipient_list=[recipient_email],
            language=language_code,
            from_email=sender_email
        )
        logger.info("Sent payment confirmation email for order %s", order.id)
    except Exception as exc:
        logger.error("Failed to send payment confirmation email for order %s: %s", order.id, exc, exc_info=True)


def send_ticket_purchased_email(order, purchased_tickets, language=None):
    """Send 'Purchased Ticket' email with unique access codes after successful payment.

    Args:
        order: Order instance
        purchased_tickets: List of PurchasedTicket instances belonging to this order
        language: Language code ('sk' or 'en'). Defaults to order.language.
    """
    recipient_email = order.email or (order.user.email if order.user else None)
    if order is None or not recipient_email:
        logger.warning("Cannot send ticket purchased email without email (order #%s)", getattr(order, 'id', '?'))
        return

    if not purchased_tickets:
        return

    logger.info("Sending ticket purchased email for order %s to %s", order.id, recipient_email)

    base_url = getattr(settings, "FRONTEND_URL", "http://www.wake-tf-up.eu").rstrip("/")
    settings_obj = MainSettings.objects.first()
    support_email = settings_obj.contact_email if settings_obj else settings.DEFAULT_CONTACT_EMAIL
    sender_email = getattr(settings, "DEFAULT_FROM_EMAIL", support_email)
    language_code = language if language else (order.language if hasattr(order, 'language') and order.language else (get_email_language(user=order.user) if order.user else 'sk'))

    context = {
        "order": order,
        "user": order.user,
        "purchased_tickets": purchased_tickets,
        "frontend_base_url": base_url,
        "support_email": support_email,
    }

    try:
        send_localized_email(
            subject_sk=f"Zakúpená vstupenka – Objednávka #{order.id}",
            subject_en=f"Purchased Ticket – Order #{order.id}",
            template_path="orders/ticket_purchased_email.html",
            context=context,
            recipient_list=[recipient_email],
            language=language_code,
            from_email=sender_email,
        )
        logger.info("Sent ticket purchased email for order %s", order.id)
    except Exception as exc:
        logger.error("Failed to send ticket purchased email for order %s: %s", order.id, exc, exc_info=True)

