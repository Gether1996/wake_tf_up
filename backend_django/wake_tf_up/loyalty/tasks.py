"""
Loyalty tasks for background processing.
Used for sending loyalty reward emails after user completes 3 orders.
"""
from datetime import datetime
from django.conf import settings
from core.email_utils import send_localized_email, get_email_language


def send_loyalty_code_email(user, discount_code):
    """
    Send loyalty discount code email to user.
    
    Args:
        user: User instance
        discount_code: DiscountCode instance
    """
    # Get user's preferred language
    language = get_email_language(user=user)
    
    # Prepare email context
    context = {
        'user_name': user.first_name or user.email.split('@')[0],
        'discount_code': discount_code.code,
        'discount_percentage': discount_code.discount_percentage,
        'valid_until': discount_code.valid_until.strftime('%d.%m.%Y'),
        'year': datetime.now().year,
    }
    
    try:
        send_localized_email(
            subject_sk='Ďakujeme za vernosť! Odmena v emaile',
            subject_en='Thank You for Your Loyalty! Reward Inside',
            template_path='loyalty/loyalty_reward.html',
            context=context,
            recipient_list=[user.email],
            language=language,
        )
        print(f"Loyalty code sent to {user.email}: {discount_code.code}")
    except Exception as e:
        print(f"Failed to send loyalty code to {user.email}: {str(e)}")
