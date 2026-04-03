from rest_framework import serializers
from .models import PaymentTransaction


class PaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for payment transaction"""
    
    class Meta:
        model = PaymentTransaction
        fields = (
            'id', 'order', 'amount', 'status', 'provider',
            'provider_transaction_id', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class CreatePaymentSerializer(serializers.Serializer):
    """Serializer for creating a payment"""
    order_id = serializers.IntegerField(required=True)
    access_token = serializers.CharField(required=False, allow_blank=True)


class PaymentStatusSerializer(serializers.Serializer):
    """Serializer for payment status response"""
    success = serializers.BooleanField()
    state = serializers.CharField(required=False)
    transaction_id = serializers.CharField(required=False)
    error = serializers.CharField(required=False)
