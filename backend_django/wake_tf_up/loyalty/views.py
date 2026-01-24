from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import redirect
from .models import DiscountCode, LoyaltyService, QRCode
from .serializers import (
    DiscountCodeSerializer,
    ValidateDiscountCodeSerializer,
    ApplyDiscountCodeResponseSerializer,
    QRCodeSerializer
)
from decimal import Decimal


class UserDiscountCodesView(generics.ListAPIView):
    """
    Get all active discount codes for the authenticated user.
    GET /api/v1/loyalty/my-codes/
    """
    serializer_class = DiscountCodeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return DiscountCode.objects.filter(
            user=self.request.user,
            is_active=True,
            is_used=False
        )


class ValidateDiscountCodeView(APIView):
    """
    Validate a discount code.
    POST /api/v1/loyalty/validate-code/
    
    Body: {
        "code": "LOYAL12345678",
        "order_total": 100.00
    }
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ValidateDiscountCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        code = serializer.validated_data['code']
        order_total = serializer.validated_data['order_total']
        
        # Pass the user if authenticated, None otherwise
        user = request.user if request.user.is_authenticated else None
        result = LoyaltyService.apply_discount_code(code, order_total, user=user)
        
        if result['valid']:
            result['final_total'] = order_total - result['discount_amount']
        
        return Response(result, status=status.HTTP_200_OK)


class GenerateLoyaltyCodeView(APIView):
    """
    Manually trigger loyalty code generation for authenticated user.
    POST /api/v1/loyalty/generate-loyalty-code/
    
    This checks if user qualifies and generates if they don't have one yet.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        code = LoyaltyService.check_and_generate_loyalty_code(request.user)
        
        if code:
            serializer = DiscountCodeSerializer(code)
            return Response({
                'message': 'Loyalty code generated successfully',
                'code': serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'message': 'You do not qualify for a loyalty code yet. Need at least 3 paid orders.'
            }, status=status.HTTP_400_BAD_REQUEST)


class QRCodeScanView(APIView):
    """
    Handle QR code scan tracking and redirect.
    GET /api/v1/loyalty/qr/<code>/
    
    Increments scan count and redirects to target URL.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, code):
        try:
            qr_code = QRCode.objects.get(code=code, is_active=True)
            qr_code.increment_scan_count()
            return redirect(qr_code.target_url)
        except QRCode.DoesNotExist:
            return Response({
                'error': 'QR code not found or inactive'
            }, status=status.HTTP_404_NOT_FOUND)
