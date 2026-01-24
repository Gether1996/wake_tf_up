from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Subscriber, NewsletterPopupStat
from .serializers import SubscriberSerializer, NewsletterPopupStatSerializer


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
            
            # Send discount code after 5 minutes
            from loyalty.tasks import send_newsletter_discount_code_delayed
            send_newsletter_discount_code_delayed(email, delay_seconds=300)
            
            return Response(
                {'message': 'Subscription reactivated. You will receive a discount code in 5 minutes.'},
                status=status.HTTP_200_OK
            )
        elif not created:
            return Response(
                {'message': 'Already subscribed'},
                status=status.HTTP_200_OK
            )
        
        # Send discount code after 5 minutes for new subscribers
        from loyalty.tasks import send_newsletter_discount_code_delayed
        send_newsletter_discount_code_delayed(email, delay_seconds=300)
        
        return Response(
            {'message': 'Successfully subscribed! You will receive a 5% discount code in 5 minutes.'},
            status=status.HTTP_201_CREATED
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
