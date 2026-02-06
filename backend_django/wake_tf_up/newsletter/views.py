from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from datetime import datetime
from .models import Subscriber, NewsletterPopupStat, NewsletterTemplate, DiscountCodeTemplate, NewsletterImage
from .serializers import SubscriberSerializer, NewsletterPopupStatSerializer, NewsletterImageSerializer


class SubscribeView(generics.CreateAPIView):
    """
    Subscribe to newsletter.
    POST /api/v1/newsletter/subscribe/
    
    Body: {"email": "user@example.com"}
    """
    serializer_class = SubscriberSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
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
            
            return Response(
                {'message': 'Subscription reactivated.'},
                status=status.HTTP_200_OK
            )
        elif not created:
            return Response(
                {'message': 'Already subscribed'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'message': 'Successfully subscribed!'},
            status=status.HTTP_201_CREATED
        )


class UnsubscribeView(APIView):
    """
    Unsubscribe from newsletter.
    GET/POST /api/v1/newsletter/unsubscribe/?email=user@example.com
    or POST with body: {"email": "user@example.com"}
    """
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


class NewsletterPopupTrackView(generics.CreateAPIView):
    """
    Track newsletter popup interactions (subscribed or dismissed).
    POST /api/v1/newsletter/popup-track/
    
    Body: {
        "session_id": "unique-session-id",
        "action": "subscribed" or "dismissed",
        "email": "user@example.com" (optional, only for subscribed),
        "ip_address": "192.168.1.1" (optional),
        "user_agent": "Mozilla/5.0..." (optional)
    }
    """
    serializer_class = NewsletterPopupStatSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        # Get client IP
        ip_address = self.get_client_ip(request)
        
        # Get user agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        data = request.data.copy()
        data['ip_address'] = ip_address
        data['user_agent'] = user_agent
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Add user if authenticated
        user = request.user if request.user.is_authenticated else None
        serializer.save(user=user)
        
        return Response(
            {'message': 'Popup interaction tracked successfully'},
            status=status.HTTP_201_CREATED
        )
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


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
    unsubscribe_link = f"{base_url}/api/v1/newsletter/unsubscribe/?email=example@example.com"
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
    unsubscribe_link = f"{base_url}/api/v1/newsletter/unsubscribe/?email=example@example.com"
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
