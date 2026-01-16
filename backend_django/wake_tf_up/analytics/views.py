from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import ProductEvent
from .serializers import ProductEventSerializer


class ProductEventCreateView(generics.CreateAPIView):
    """
    Record a product event (view/click).
    POST /api/v1/analytics/events/
    
    Body: {
        "product": <product_id>,
        "event_type": "view" or "click",
        "session_id": "<optional session id for anonymous users>"
    }
    """
    serializer_class = ProductEventSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'status': 'Event recorded'},
            status=status.HTTP_201_CREATED
        )
