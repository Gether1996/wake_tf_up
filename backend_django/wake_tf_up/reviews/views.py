from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ValidationError
from .models import Review, ReviewToken
from .serializers import ReviewSerializer, ReviewListSerializer, ReviewWithProductSerializer


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


class ReviewViaTokenView(APIView):
    """
    Submit a review using a token from email link (no authentication required).
    POST /api/v1/reviews/submit-via-token/
    
    Body:
    {
        "token": "secure_token_string",
        "rating": 5,
        "text": "Great product!",
        "reviewer_name": "John Doe",  // optional
        "is_anonymous": false  // optional, default false
    }
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        token_string = request.data.get('token')
        rating = request.data.get('rating')
        text = request.data.get('text', '')
        reviewer_name = request.data.get('reviewer_name', '')
        is_anonymous = request.data.get('is_anonymous', False)
        
        # Validate required fields
        if not token_string:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not rating:
            return Response(
                {'error': 'Rating is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate rating range
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {'error': 'Rating must be between 1 and 5'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate text
        if not text or not text.strip():
            return Response(
                {'error': 'Review text is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(text) > 1000:
            return Response(
                {'error': 'Review text must be 1000 characters or less'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate reviewer_name
        if reviewer_name and len(reviewer_name) > 100:
            return Response(
                {'error': 'Reviewer name must be 100 characters or less'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find token
        try:
            review_token = ReviewToken.objects.select_related(
                'user', 'product', 'order'
            ).get(token=token_string)
        except ReviewToken.DoesNotExist:
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate token
        if not review_token.is_valid():
            if review_token.is_used:
                error_msg = 'This review link has already been used'
            else:
                error_msg = 'This review link has expired'
            
            return Response(
                {'error': error_msg},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if review already exists
        existing_review = Review.objects.filter(
            product=review_token.product,
            user=review_token.user
        ).first()
        
        if existing_review:
            return Response(
                {'error': 'You have already reviewed this product'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create review (skip validation since token confirms purchase)
        review = Review(
            product=review_token.product,
            user=review_token.user,
            rating=rating,
            text=text,
            reviewer_name=reviewer_name,
            is_anonymous=is_anonymous
        )
        review.save(skip_validation=True)
        
        # Mark token as used
        review_token.mark_used()
        
        return Response(
            {
                'message': 'Review submitted successfully',
                'review': {
                    'id': review.id,
                    'product': review.product.name,
                    'rating': review.rating,
                    'text': review.text,
                    'display_name': review.get_display_name(),
                    'is_anonymous': review.is_anonymous,
                    'created_at': review.created_at
                }
            },
            status=status.HTTP_201_CREATED
        )


class FeaturedReviewsView(generics.ListAPIView):
    """
    Get featured reviews with product details for homepage showcase.
    GET /api/v1/reviews/featured/
    
    Returns recent reviews with high ratings (4-5 stars) including product info.
    """
    serializer_class = ReviewWithProductSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        # Get reviews with 4-5 stars, ordered by most recent
        return Review.objects.filter(
            rating__gte=4
        ).select_related('user', 'product').prefetch_related(
            'product__images'
        ).order_by('-created_at')[:12]  # Limit to 12 recent good reviews
