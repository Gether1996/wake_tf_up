"""
Core views for general functionality like contact form.
"""
import logging
import re
from django.conf import settings
from django.core.mail import send_mail
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from settings.models import MainSettings

logger = logging.getLogger(__name__)

EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


class ContactRateThrottle(AnonRateThrottle):
    """Limit contact form submissions to 5 per hour per IP."""
    rate = '5/hour'


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@throttle_classes([ContactRateThrottle])
def send_contact_email(request):
    """
    Send contact form email to the admin.
    
    POST /api/v1/contact/
    Body: {
        "name": "John Doe",
        "email": "john@example.com",
        "message": "Hello, I have a question..."
    }
    """
    name = request.data.get('name', '').strip()
    email = request.data.get('email', '').strip()
    message = request.data.get('message', '').strip()
    
    # Validation
    if not name or not email or not message:
        return Response(
            {'error': 'All fields are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not EMAIL_RE.match(email):
        return Response(
            {'error': 'Invalid email address'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(message) < 10:
        return Response(
            {'error': 'Message is too short (minimum 10 characters)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(message) > 5000:
        return Response(
            {'error': 'Message is too long (maximum 5000 characters)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get recipient email from settings
    settings_obj = MainSettings.get_settings()
    recipient_email = settings_obj.contact_email or getattr(settings, 'DEFAULT_CONTACT_EMAIL', settings.DEFAULT_FROM_EMAIL)
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', recipient_email)
    
    # Compose email
    subject = f'[WAKE TF UP Contact] Message from {name}'
    email_body = f"""
New contact form submission:

From: {name}
Email: {email}

Message:
{message}

---
This email was sent from the WAKE TF UP contact form.
Reply to: {email}
"""
    
    try:
        logger.info(f'[Contact Form] Attempting to send email from {email} to {recipient_email}')
        
        send_mail(
            subject=subject,
            message=email_body,
            from_email=from_email,
            recipient_list=[recipient_email],
            fail_silently=False
        )
        
        logger.info(f'[Contact Form] ✓ Email sent successfully from {email}')
        
        return Response(
            {'message': 'Your message has been sent successfully!'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f'[Contact Form] ✗ Failed to send email: {e}', exc_info=True)
        return Response(
            {'error': 'Failed to send email. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
