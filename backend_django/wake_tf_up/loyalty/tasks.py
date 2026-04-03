"""
Loyalty tasks for background processing.
Used for sending loyalty reward emails after user completes 3 orders.
"""
import logging
from datetime import datetime

from core.email_utils import get_email_language, send_localized_email


logger = logging.getLogger(__name__)


def send_loyalty_code_email(user, discount_code):
    """
    Send loyalty discount code email to user.

    Args:
        user: User instance
        discount_code: DiscountCode instance
    """
    language = get_email_language(user=user)
    context = {
        'user_name': user.first_name or user.email.split('@')[0],
        'discount_code': discount_code.code,
        'discount_percentage': discount_code.discount_percentage,
        'valid_until': discount_code.valid_until.strftime('%d.%m.%Y'),
        'year': datetime.now().year,
    }

    try:
        send_localized_email(
            subject_sk='Dakujeme za vernost! Odmena v emaile',
            subject_en='Thank You for Your Loyalty! Reward Inside',
            template_path='loyalty/loyalty_reward.html',
            context=context,
            recipient_list=[user.email],
            language=language,
        )
        logger.info("Loyalty code email sent to %s for code %s", user.email, discount_code.code)
    except Exception as exc:
        logger.error("Failed to send loyalty code email to %s: %s", user.email, exc, exc_info=True)
