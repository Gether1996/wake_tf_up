from rest_framework import serializers
from .models import DiscountCode, QRCode


class DiscountCodeSerializer(serializers.ModelSerializer):
    """Serializer for discount codes"""
    
    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'discount_percentage', 'minimum_order_value',
            'is_free_shipping', 'code_type', 'is_active', 'is_used', 
            'usage_count', 'max_uses', 'valid_from', 'valid_until', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'usage_count']


class ValidateDiscountCodeSerializer(serializers.Serializer):
    """Serializer for validating discount codes"""
    code = serializers.CharField(max_length=50)
    order_total = serializers.DecimalField(max_digits=10, decimal_places=2)


class ApplyDiscountCodeResponseSerializer(serializers.Serializer):
    """Response serializer for discount code validation"""
    valid = serializers.BooleanField()
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    message = serializers.CharField()
    code_id = serializers.IntegerField(required=False)
    is_free_shipping = serializers.BooleanField(required=False)
    final_total = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


class QRCodeSerializer(serializers.ModelSerializer):
    """Serializer for QR codes"""
    
    class Meta:
        model = QRCode
        fields = [
            'id', 'title', 'code', 'qr_type', 'target_url',
            'scan_count', 'is_active', 'created_at', 'last_scanned_at'
        ]
        read_only_fields = ['id', 'code', 'scan_count', 'created_at', 'last_scanned_at']
