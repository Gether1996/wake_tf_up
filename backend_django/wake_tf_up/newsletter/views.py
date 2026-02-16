import logging
from datetime import datetime

from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.core.mail import send_mail
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView

from settings.models import MainSettings
from core.email_utils import get_email_language, send_localized_email
from .models import Subscriber, NewsletterPopupStat, NewsletterTemplate, DiscountCodeTemplate, NewsletterImage
from .serializers import SubscriberSerializer, NewsletterImageSerializer, NewsletterPopupStatSerializer


logger = logging.getLogger(__name__)


def send_subscription_confirmation_email(email: str, request=None):
    """Send a confirmation email after a user subscribes to the newsletter."""
    if not email:
        logger.warning('Attempted to send confirmation email without email address')
        return

    logger.info('Starting to send newsletter confirmation email to: %s', email)

    settings_obj = MainSettings.get_settings()
    support_email = settings_obj.contact_email or getattr(settings, 'DEFAULT_CONTACT_EMAIL', settings.DEFAULT_FROM_EMAIL)
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', support_email)
    base_url = getattr(settings, 'FRONTEND_URL', 'https://wake-tf-up.eu').rstrip('/')
    # Get language from request if available, otherwise default to 'sk'
    language_code = get_email_language(request=request)

    logger.debug('Newsletter email config - support_email: %s, base_url: %s, language: %s', support_email, base_url, language_code)

    context = {
        'site_name': settings_obj.site_name,
        'support_email': support_email,
        'shop_url': f"{base_url}/{language_code}/shop",
        'unsubscribe_url': f"{base_url}/{language_code}/newsletter/unsubscribe?email={email}",
        'instagram_url': settings_obj.instagram_url,
        'facebook_url': settings_obj.facebook_url,
        'twitter_url': settings_obj.twitter_url,
    }

    try:
        logger.info('Attempting to send subscription confirmation email to %s from %s', email, from_email)
        send_localized_email(
            subject_sk=f"Potvrdenie odberu | {settings_obj.site_name}",
            subject_en=f"Subscription Confirmation | {settings_obj.site_name}",
            template_path='newsletter/subscription_confirmation_email.html',
            context=context,
            recipient_list=[email],
            language=language_code,
            from_email=from_email
        )
        logger.info('Newsletter confirmation email sent successfully to %s', email)
    except Exception as exc:
        logger.error('Failed to send newsletter confirmation email to %s: %s', email, exc, exc_info=True)


class SubscribeView(generics.CreateAPIView):
    """
    Subscribe to newsletter.
    POST /api/v1/newsletter/subscribe/
    
    Body: {
        "email": "user@example.com",
        "language": "en"  // optional, defaults to 'sk'
    }
    """
    serializer_class = SubscriberSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        language = serializer.validated_data.get('language', 'sk')
        
        # Set language on request so it can be picked up by email utils
        request.LANGUAGE_CODE = language
        
        # Check if already subscribed
        subscriber, created = Subscriber.objects.get_or_create(
            email=email,
            defaults={'is_active': True}
        )
        
        if not created and not subscriber.is_active:
            # Reactivate if previously unsubscribed
            subscriber.is_active = True
            subscriber.unsubscribed_at = None
            subscriber.save()
            send_subscription_confirmation_email(email, request)
            
            return Response(
                {'message': 'Subscription reactivated.'},
                status=status.HTTP_200_OK
            )
        elif not created:
            return Response(
                {'message': 'Already subscribed'},
                status=status.HTTP_200_OK
            )
        
        send_subscription_confirmation_email(email, request)
        return Response(
            {'message': 'Successfully subscribed!'},
            status=status.HTTP_201_CREATED
        )


class UnsubscribeView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        email = request.query_params.get('email', '')
        return self._process_unsubscribe(email)
    
    def post(self, request):
        email = request.data.get('email', '')
        return self._process_unsubscribe(email)
    
    def _process_unsubscribe(self, email):
        if not email:
            return Response(
                {'error': 'Email parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            subscriber = Subscriber.objects.get(email=email)
            
            if not subscriber.is_active:
                return Response(
                    {'message': 'Already unsubscribed'},
                    status=status.HTTP_200_OK
                )
            
            subscriber.is_active = False
            subscriber.unsubscribed_at = datetime.now()
            subscriber.save()
            
            return Response(
                {'message': 'Successfully unsubscribed'},
                status=status.HTTP_200_OK
            )
            
        except Subscriber.DoesNotExist:
            return Response(
                {'error': 'Email not found in subscriber list'},
                status=status.HTTP_404_NOT_FOUND
            )


class NewsletterPopupTrackView(generics.GenericAPIView):
    """
    Track newsletter popup interactions for statistics only.
    POST /api/v1/newsletter/popup-track/
    
    Body: {
        "action": "shown" or "subscribed" or "dismissed"
    }
    
    Increments the appropriate counter in the singleton stats record.
    """
    serializer_class = NewsletterPopupStatSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        
        # Get or create the singleton stats instance
        stats = NewsletterPopupStat.load()
        
        # Increment the appropriate counter
        if action == 'shown':
            stats.increment_shown()
        elif action == 'subscribed':
            stats.increment_subscribed()
        elif action == 'dismissed':
            stats.increment_dismissed()
        
        return Response(
            {'message': 'Popup interaction tracked successfully'},
            status=status.HTTP_200_OK
        )


class IsSuperuser(permissions.BasePermission):
    """Custom permission to only allow superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class NewsletterImageListView(generics.ListAPIView):
    """
    List all newsletter images (for admin use in content creation).
    GET /api/v1/newsletter/images/
    """
    queryset = NewsletterImage.objects.all().order_by('-created_at')
    serializer_class = NewsletterImageSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'alt_text', 'caption']
    ordering_fields = ['created_at', 'title']


@staff_member_required
def newsletter_template_preview(request, pk):
    """Preview newsletter template HTML"""
    from django.conf import settings
    template = get_object_or_404(NewsletterTemplate, pk=pk)
    
    # Replace placeholders with sample values
    html_content = template.content_html
    # Auto-generate unsubscribe URL from settings
    base_url = settings.FRONTEND_URL or 'https://wake-tf-up.eu'
    # Get language from request
    language_code = getattr(request, 'LANGUAGE_CODE', 'sk')
    unsubscribe_link = f"{base_url}/{language_code}/newsletter/unsubscribe?email=example@example.com"
    html_content = html_content.replace('{{unsubscribe_url}}', unsubscribe_link)
    # Replace site URL placeholder
    html_content = html_content.replace('{{site_url}}', base_url)
    # Also replace direct {{email}} placeholders
    html_content = html_content.replace('{{email}}', 'example@example.com')
    
    preview_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Preview: {template.subject}</title>
        <style>
            body {{
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                font-family: Arial, sans-serif;
            }}
            .preview-info {{
                background: #fff;
                padding: 15px;
                margin-bottom: 20px;
                border-left: 4px solid #2196F3;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .preview-info h2 {{
                margin: 0 0 10px 0;
                color: #333;
            }}
            .preview-info p {{
                margin: 5px 0;
                color: #666;
            }}
            .email-container {{
                background: #fff;
                max-width: 800px;
                margin: 0 auto;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }}
        </style>
    </head>
    <body>
        <div class="preview-info">
            <h2>📧 Newsletter Preview</h2>
            <p><strong>Subject:</strong> {template.subject}</p>
            <p><strong>Last Sent:</strong> {template.last_sent.strftime('%d.%m.%Y %H:%M') if template.last_sent else 'Never'}</p>
        </div>
        <div class="email-container">
            {html_content}
        </div>
    </body>
    </html>
    """
    
    return HttpResponse(preview_html)


def discount_template_preview(request, pk):
    """Preview discount code template HTML with placeholder values"""
    from django.conf import settings
    template = get_object_or_404(DiscountCodeTemplate, pk=pk)
    
    # Replace placeholders with actual or sample values
    html_content = template.content_html
    # Auto-generate unsubscribe URL from settings
    base_url = settings.FRONTEND_URL or 'https://wake-tf-up.eu'
    # Get language from request
    language_code = getattr(request, 'LANGUAGE_CODE', 'sk')
    unsubscribe_link = f"{base_url}/{language_code}/newsletter/unsubscribe?email=example@example.com"
    html_content = html_content.replace('{{unsubscribe_url}}', unsubscribe_link)
    # Replace site URL placeholder
    html_content = html_content.replace('{{site_url}}', base_url)
    # Also replace direct {{email}} placeholders
    html_content = html_content.replace('{{email}}', 'example@example.com')
    html_content = html_content.replace('{{discount_code}}', template.discount_code or 'SAMPLE10')
    html_content = html_content.replace('{{discount_percentage}}', str(template.discount_percentage or '10'))
    if template.valid_until:
        html_content = html_content.replace('{{valid_until}}', template.valid_until.strftime('%d.%m.%Y'))
    else:
        from datetime import timedelta
        sample_date = (datetime.now() + timedelta(days=30)).strftime('%d.%m.%Y')
        html_content = html_content.replace('{{valid_until}}', sample_date)
    
    preview_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Preview: {template.subject}</title>
        <style>
            body {{
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                font-family: Arial, sans-serif;
            }}
            .preview-info {{
                background: #fff;
                padding: 15px;
                margin-bottom: 20px;
                border-left: 4px solid #FF9800;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .preview-info h2 {{
                margin: 0 0 10px 0;
                color: #333;
            }}
            .preview-info p {{
                margin: 5px 0;
                color: #666;
            }}
            .email-container {{
                background: #fff;
                max-width: 800px;
                margin: 0 auto;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }}
        </style>
    </head>
    <body>
        <div class="preview-info">
            <h2>🎁 Discount Code Email Preview</h2>
            <p><strong>Subject:</strong> {template.subject}</p>
            <p><strong>Discount Code:</strong> {template.discount_code or 'Not set'}</p>
            <p><strong>Discount:</strong> {template.discount_percentage}%</p>
            <p><strong>Valid Until:</strong> {template.valid_until.strftime('%d.%m.%Y %H:%M') if template.valid_until else 'Not set'}</p>
            <p><strong>Last Sent:</strong> {template.last_sent.strftime('%d.%m.%Y %H:%M') if template.last_sent else 'Never'}</p>
        </div>
        <div class="email-container">
            {html_content}
        </div>
    </body>
    </html>
    """
    
    return HttpResponse(preview_html)
