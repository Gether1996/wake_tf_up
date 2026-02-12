from rest_framework import serializers
from .models import Order, OrderItem
from shop.serializers import ProductListSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items"""
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    subtotal = serializers.ReadOnlyField()
    
    class Meta:
        model = OrderItem
        fields = (
            'id', 'product', 'product_id', 'quantity',
            'price_at_purchase', 'is_pre_order', 'subtotal'
        )
        read_only_fields = ('price_at_purchase', 'is_pre_order')


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating orders"""
    items = OrderItemSerializer(many=True)
    discount_code_str = serializers.CharField(write_only=True, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(
        choices=[('gopay', 'GoPay'), ('cash_on_pickup', 'Cash on Pickup')],
        default='gopay'
    )
    
    class Meta:
        model = Order
        fields = (
            'shipping_method', 'shipping_name', 'shipping_address', 'shipping_city',
            'shipping_postal_code', 'shipping_country', 'phone',
            'packeta_point_id', 'packeta_point_name', 'packeta_point_address',
            'is_company_purchase', 'billing_company', 'billing_ico', 'billing_dic', 'billing_ic_dph',
            'payment_method', 'items', 'discount_code_str'
        )
    
    def create(self, validated_data):
        from .models import StockReservationService
        from rest_framework.exceptions import ValidationError as DRFValidationError
        
        items_data = validated_data.pop('items')
        discount_code_str = validated_data.pop('discount_code_str', None)
        user = self.context['request'].user
        
        # Use the stock reservation service
        order = StockReservationService.create_order_with_items(
            user=user,
            items_data=items_data,
            shipping_data=validated_data
        )
        
        # Apply discount code if provided
        if discount_code_str:
            from loyalty.models import DiscountCode
            from django.core.exceptions import ValidationError
            try:
                discount_code = DiscountCode.objects.get(code=discount_code_str)
                order.apply_discount(discount_code)
            except DiscountCode.DoesNotExist:
                # Silently ignore invalid codes
                pass
            except ValidationError as e:
                # Raise DRF ValidationError if discount code already applied
                raise DRFValidationError({'discount_code': str(e)})
        
        return order


class OrderListSerializer(serializers.ModelSerializer):
    """Serializer for order list"""
    items = OrderItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    is_pre_order = serializers.ReadOnlyField()
    discount_code_display = serializers.CharField(source='discount_code.code', read_only=True)
    
    class Meta:
        model = Order
        fields = (
            'id', 'status', 'shipping_method', 'shipping_cost', 'total_amount', 'discount_amount',
            'discount_code_display', 'payment_method', 'items', 'items_count',
            'is_pre_order', 'created_at', 'updated_at'
        )
    
    def get_items_count(self, obj):
        return obj.items.count()


class OrderDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for order detail"""
    items = OrderItemSerializer(many=True, read_only=True)
    is_pre_order = serializers.ReadOnlyField()
    discount_code_display = serializers.CharField(source='discount_code.code', read_only=True)
    
    class Meta:
        model = Order
        fields = (
            'id', 'status', 'shipping_method', 'shipping_name', 'shipping_address',
            'shipping_city', 'shipping_postal_code', 'shipping_country',
            'phone', 'packeta_point_id', 'packeta_point_name', 'packeta_point_address',
            'tracking_number', 'carrier_tracking_url',
            'is_company_purchase', 'billing_company', 'billing_ico', 
            'billing_dic', 'billing_ic_dph', 'shipping_cost', 'total_amount', 'discount_amount',
            'discount_code_display', 'payment_method', 'is_pre_order', 'items',
            'created_at', 'updated_at'
        )
