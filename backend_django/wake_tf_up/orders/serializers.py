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
    
    class Meta:
        model = Order
        fields = (
            'shipping_method', 'shipping_name', 'shipping_address', 'shipping_city',
            'shipping_postal_code', 'shipping_country', 'phone',
            'is_company_purchase', 'billing_company', 'billing_ico', 'billing_dic', 'billing_ic_dph',
            'items'
        )
    
    def create(self, validated_data):
        from .models import StockReservationService
        
        items_data = validated_data.pop('items')
        user = self.context['request'].user
        
        # Use the stock reservation service
        order = StockReservationService.create_order_with_items(
            user=user,
            items_data=items_data,
            shipping_data=validated_data
        )
        
        return order


class OrderListSerializer(serializers.ModelSerializer):
    """Serializer for order list"""
    items = OrderItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    is_pre_order = serializers.ReadOnlyField()
    
    class Meta:
        model = Order
        fields = (
            'id', 'status', 'shipping_method', 'total_amount', 'items', 'items_count',
            'is_pre_order', 'created_at', 'updated_at'
        )
    
    def get_items_count(self, obj):
        return obj.items.count()


class OrderDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for order detail"""
    items = OrderItemSerializer(many=True, read_only=True)
    is_pre_order = serializers.ReadOnlyField()
    
    class Meta:
        model = Order
        fields = (
            'id', 'status', 'shipping_method', 'shipping_name', 'shipping_address',
            'shipping_city', 'shipping_postal_code', 'shipping_country',
            'phone', 'is_company_purchase', 'billing_company', 'billing_ico', 
            'billing_dic', 'billing_ic_dph', 'total_amount', 'is_pre_order', 'items',
            'created_at', 'updated_at'
        )
