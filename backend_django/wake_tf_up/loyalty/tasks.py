"""
Loyalty tasks for background processing.
Uses threading for delayed email sending (alternative to Celery).
"""
import threading
import time
from django.core.mail import send_mail
from django.conf import settings


def send_newsletter_discount_code_delayed(email, delay_seconds=300):
    """
    Send newsletter discount code after a delay (default 5 minutes).
    
    Args:
        email: Subscriber email address
        delay_seconds: Delay in seconds (default 300 = 5 minutes)
    """
    def _send_email():
        # Wait for the specified delay
        time.sleep(delay_seconds)
        
        # Generate discount code
        from loyalty.models import LoyaltyService
        discount_code = LoyaltyService.generate_newsletter_code(email)
        
        # Prepare email
        subject = 'Welcome! Here\'s Your 5% Discount Code'
        message = f"""
Dear Subscriber,

Thank you for subscribing to our newsletter!

As promised, here is your exclusive 5% discount code:

CODE: {discount_code.code}
Discount: {discount_code.discount_percentage}%
Minimum order: {discount_code.minimum_order_value}€
Valid until: {discount_code.valid_until.strftime('%Y-%m-%d')}

Use this code at checkout to enjoy your discount!

Best regards,
Wake TF Up Team
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            print(f"Newsletter discount code sent to {email}: {discount_code.code}")
        except Exception as e:
            print(f"Failed to send newsletter code to {email}: {str(e)}")
    
    # Start the background thread
    thread = threading.Thread(target=_send_email, daemon=True)
    thread.start()


def send_loyalty_code_email(user, discount_code):
    """
    Send loyalty discount code email to user.
    
    Args:
        user: User instance
        discount_code: DiscountCode instance
    """
    subject = 'Thank You! Loyalty Reward Inside'
    message = f"""
Dear {user.email},

Thank you for being a loyal customer!

You've qualified for a special loyalty discount:

CODE: {discount_code.code}
Discount: {discount_code.discount_percentage}%
Valid until: {discount_code.valid_until.strftime('%Y-%m-%d')}

This code is our way of saying thank you for your continued support.

Best regards,
Wake TF Up Team
    """
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        print(f"Loyalty code sent to {user.email}: {discount_code.code}")
    except Exception as e:
        print(f"Failed to send loyalty code to {user.email}: {str(e)}")
