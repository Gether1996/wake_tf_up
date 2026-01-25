from rest_framework import serializers
from .models import Product, Category, Color, ProductImage, ProductVideo


class RelativeImageField(serializers.ImageField):
    """Custom ImageField that returns relative URLs instead of absolute"""
    def to_representation(self, value):
        if not value:
            return None
        # Return relative URL path (nginx handles the domain)
        return value.url


class RelativeFileField(serializers.FileField):
    """Custom FileField that returns relative URLs instead of absolute"""
    def to_representation(self, value):
        if not value:
            return None
        # Return relative URL path (nginx handles the domain)
        return value.url


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
    image = RelativeImageField()
    
    class Meta:
        model = ProductImage
        fields = ('id', 'image', 'order')


class ProductVideoSerializer(serializers.ModelSerializer):
    """Serializer for product videos"""
    video = RelativeFileField()
    thumbnail = RelativeImageField()
    
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
            # Return relative URL path instead of absolute URL
            # Nginx reverse proxy will handle proper domain
            return image.image.url
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
