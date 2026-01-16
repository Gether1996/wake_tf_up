from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Subscriber
from .serializers import SubscriberSerializer


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
                {'message': 'Subscription reactivated'},
                status=status.HTTP_200_OK
            )
        elif not created:
            return Response(
                {'message': 'Already subscribed'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'message': 'Successfully subscribed'},
            status=status.HTTP_201_CREATED
        )
