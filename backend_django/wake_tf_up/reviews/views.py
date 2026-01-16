from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from .models import Review
from .serializers import ReviewSerializer, ReviewListSerializer


class ReviewCreateView(generics.CreateAPIView):
    """
    Create a review (requires purchase).
    POST /api/v1/reviews/
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            review = serializer.save()
            return Response(
                ReviewSerializer(review).data,
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ReviewListView(generics.ListAPIView):
    """
    List reviews for a specific product.
    GET /api/v1/reviews/?product={product_id}
    """
    serializer_class = ReviewListSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        queryset = Review.objects.select_related('user')
        product_id = self.request.query_params.get('product')
        
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        return queryset
