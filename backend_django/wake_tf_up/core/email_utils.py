"""
Utility functions for email handling across the application.
Provides language-aware template selection and email sending helpers.
"""
from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def get_email_language(request=None, user=None, default='sk'):
    """
    Get the appropriate language for email based on request, user preference, or default.
    
    Args:
        request: Django request object (optional)
        user: User object with preferred_language field (optional)
        default: Default language if none specified (default: 'sk')
    
    Returns:
        str: Language code ('sk' or 'en')
    """
    # Priority 1: User's preferred language (if user model has this field)
    if user and hasattr(user, 'preferred_language'):
        return user.preferred_language
    
    # Priority 2: Request language (from middleware)
    if request:
        lang = getattr(request, 'LANGUAGE_CODE', None)
        if lang in ['sk', 'en']:
            return lang
    
    # Priority 3: Default
    return default


def get_localized_template(base_template, language='sk'):
    """
    Get localized email template path.
    
    Supports two patterns:
    1. folder/template_sk.html (e.g., emails/email_verification_sk.html)
    2. folder/template.sk.html (e.g., newsletter/subscription_confirmation.sk.html)
    
    Args:
        base_template: Base template path (e.g., 'newsletter/subscription_confirmation.html')
        language: Language code ('sk' or 'en')
    
    Returns:
        str: Localized template path
    
    Examples:
        >>> get_localized_template('newsletter/subscription.html', 'en')
        'newsletter/subscription.en.html'
        
        >>> get_localized_template('emails/verification_sk.html', 'en')
        'emails/verification_en.html'
    """
    # If template already has language suffix (_sk, _en), replace it
    if base_template.endswith('_sk.html'):
        return base_template.replace('_sk.html', f'_{language}.html')
    if base_template.endswith('_en.html'):
        return base_template.replace('_en.html', f'_{language}.html')
    
    # If template has .sk.html or .en.html pattern, replace it
    if '.sk.html' in base_template:
        return base_template.replace('.sk.html', f'.{language}.html')
    if '.en.html' in base_template:
        return base_template.replace('.en.html', f'.{language}.html')
    
    # Otherwise, insert language code before .html
    if base_template.endswith('.html'):
        return base_template.replace('.html', f'.{language}.html')
    
    return base_template


def send_localized_email(
    subject_sk,
    subject_en,
    template_path,
    context,
    recipient_list,
    language='sk',
    from_email=None
):
    """
    Send a localized email with both HTML and plain text versions.
    
    Args:
        subject_sk: Slovak subject line
        subject_en: English subject line
        template_path: Base template path (will be localized)
        context: Template context dictionary
        recipient_list: List of recipient emails
        language: Language code ('sk' or 'en')
        from_email: Sender email (defaults to settings.DEFAULT_FROM_EMAIL)
    
    Returns:
        int: Number of emails sent (1 or 0)
    
    Example:
        >>> send_localized_email(
        ...     subject_sk='Potvrdenie odberu',
        ...     subject_en='Subscription Confirmation',
        ...     template_path='newsletter/subscription_confirmation.html',
        ...     context={'user_name': 'John'},
        ...     recipient_list=['user@example.com'],
        ...     language='en'
        ... )
    """
    if from_email is None:
        from_email = settings.DEFAULT_FROM_EMAIL
    
    # Select correct subject
    subject = subject_sk if language == 'sk' else subject_en
    
    # Get localized template
    localized_template = get_localized_template(template_path, language)
    
    try:
        # Render HTML content
        html_content = render_to_string(localized_template, context)
        
        # Create plain text version (simple strip_tags alternative)
        from django.utils.html import strip_tags
        plain_content = strip_tags(html_content)
        
        # Send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=plain_content,
            from_email=from_email,
            to=recipient_list
        )
        email.attach_alternative(html_content, "text/html")
        result = email.send(fail_silently=False)
        
        logger.info(f'Sent localized email ({language}) to {recipient_list}')
        return result
        
    except Exception as e:
        logger.error(f'Failed to send localized email to {recipient_list}: {e}', exc_info=True)
        raise
