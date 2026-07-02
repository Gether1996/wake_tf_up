from rest_framework import serializers
from .models import Order, OrderItem
from .access import build_frontend_order_url, get_guest_order_access_token
from shop.serializers import ProductListSerializer, TicketListSerializer
from settings.models import MainSettings
from core.seller_access import is_seller_user


class OrderItemSerializer(serializers.ModelSerializer):
    """Serializer for order items"""
    product = ProductListSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    ticket = TicketListSerializer(read_only=True)
    ticket_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = (
            'id', 'product', 'product_id', 'ticket', 'ticket_id', 'quantity',
            'price_at_purchase', 'is_pre_order', 'subtotal'
        )
        read_only_fields = ('price_at_purchase', 'is_pre_order')

    def validate(self, data):
        product_id = data.get('product_id')
        ticket_id = data.get('ticket_id')
        if not product_id and not ticket_id:
            raise serializers.ValidationError("Either product_id or ticket_id must be provided.")
        if product_id and ticket_id:
            raise serializers.ValidationError("Provide either product_id or ticket_id, not both.")
        return data


class OrderCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating orders"""
    items = OrderItemSerializer(many=True, min_length=1)
    discount_code_str = serializers.CharField(write_only=True, required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(
        choices=[('gopay', 'GoPay'), ('cash_on_pickup', 'Cash on Pickup')],
        default='gopay'
    )
    # Allow blank for digital delivery orders (tickets don't need a physical address)
    shipping_address     = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_city        = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_postal_code = serializers.CharField(required=False, allow_blank=True, default='')
    shipping_country     = serializers.CharField(required=False, allow_blank=True, default='SK')
    
    email = serializers.EmailField(required=False, allow_blank=True, default='')

    class Meta:
        model = Order
        fields = (
            'shipping_method', 'shipping_name', 'email', 'shipping_address', 'shipping_city',
            'shipping_postal_code', 'shipping_country', 'phone',
            'packeta_point_id', 'packeta_point_name', 'packeta_point_address',
            'is_company_purchase', 'billing_company', 'billing_ico', 'billing_dic', 'billing_ic_dph',
            'payment_method', 'items', 'discount_code_str'
        )

    def validate_shipping_method(self, value):
        settings = MainSettings.get_settings()
        if not settings.is_shipping_method_enabled(value):
            raise serializers.ValidationError("Selected shipping method is currently unavailable.")
        return value
    
    def create(self, validated_data):
        from .models import StockReservationService
        from rest_framework.exceptions import ValidationError as DRFValidationError

        items_data = validated_data.pop('items')
        discount_code_str = validated_data.pop('discount_code_str', None)
        request = self.context['request']
        user = request.user if request.user.is_authenticated else None

        # Auto-fill email from authenticated user if not supplied by frontend
        if not validated_data.get('email') and user and user.email:
            validated_data['email'] = user.email
        
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
    items = serializers.SerializerMethodField()
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
        request = self.context.get('request')
        if request and is_seller_user(request.user) and not request.user.is_superuser:
            return obj.items.filter(product__seller=request.user).count()
        # obj.items.count() would issue a fresh COUNT query per order even though
        # the view already prefetches items — len() reuses the prefetched cache.
        return len(obj.items.all())

    def get_items(self, obj):
        items = obj.items.all()
        request = self.context.get('request')
        if request and is_seller_user(request.user) and not request.user.is_superuser:
            items = items.filter(product__seller=request.user)
        return OrderItemSerializer(items, many=True, context=self.context).data


class OrderDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for order detail"""
    items = serializers.SerializerMethodField()
    is_pre_order = serializers.ReadOnlyField()
    discount_code_display = serializers.CharField(source='discount_code.code', read_only=True)
    guest_access_token = serializers.SerializerMethodField()
    frontend_order_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = (
            'id', 'status', 'shipping_method', 'shipping_name', 'email', 'shipping_address',
            'shipping_city', 'shipping_postal_code', 'shipping_country',
            'phone', 'packeta_point_id', 'packeta_point_name', 'packeta_point_address',
            'tracking_number', 'carrier_tracking_url',
            'is_company_purchase', 'billing_company', 'billing_ico', 
            'billing_dic', 'billing_ic_dph', 'shipping_cost', 'total_amount', 'discount_amount',
            'discount_code_display', 'payment_method', 'is_pre_order', 'items',
            'language', 'guest_access_token', 'frontend_order_url',
            'delivered_at', 'created_at', 'updated_at'
        )

    def get_guest_access_token(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.is_superuser or is_seller_user(request.user):
                return None
            if obj.user_id != request.user.id:
                return None
        return get_guest_order_access_token(obj)

    def get_frontend_order_url(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if request.user.is_superuser or is_seller_user(request.user):
                return None
            if obj.user_id != request.user.id:
                return None
        return build_frontend_order_url(obj)

    def get_items(self, obj):
        items = obj.items.all()
        request = self.context.get('request')
        if request and is_seller_user(request.user) and not request.user.is_superuser:
            items = items.filter(product__seller=request.user)
        return OrderItemSerializer(items, many=True, context=self.context).data
