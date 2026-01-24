from rest_framework import serializers
from .models import Product, Category, Color, ProductImage, ProductVideo


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for categories"""
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug')


class ColorSerializer(serializers.ModelSerializer):
    """Serializer for colors"""
    class Meta:
        model = Color
        fields = ('id', 'name', 'hex_code')


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializer for product images"""
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'order')


class ProductVideoSerializer(serializers.ModelSerializer):
    """Serializer for product videos"""
    class Meta:
        model = ProductVideo
        fields = ('id', 'video', 'thumbnail', 'order')


class ProductListSerializer(serializers.ModelSerializer):
    """Serializer for product list view"""
    category = CategorySerializer(read_only=True)
    color = ColorSerializer(read_only=True)
    primary_image = serializers.SerializerMethodField()
    available_stock = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = (
            'id', 'name', 'description', 'slug', 'category', 'color',
            'price', 'discount_price', 'total_stock', 'available_stock', 'is_in_stock',
            'pre_order_enabled', 'is_limited_drop', 'is_recycled', 'primary_image', 'created_at'
        )
    
    def get_primary_image(self, obj):
        """Get the first image as primary"""
        image = obj.images.first()
        if image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image.image.url)
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for product detail view"""
    category = CategorySerializer(read_only=True)
    color = ColorSerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    videos = ProductVideoSerializer(many=True, read_only=True)
    available_stock = serializers.ReadOnlyField()
    sold_quantity = serializers.ReadOnlyField()
    is_in_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Product
        fields = (
            'id', 'name', 'description', 'slug', 'category', 'color',
            'price', 'discount_price', 'total_stock', 'sold_quantity', 'available_stock',
            'is_in_stock', 'pre_order_enabled', 'is_limited_drop', 'is_recycled', 'is_published',
            'images', 'videos', 'created_at', 'updated_at'
        )
