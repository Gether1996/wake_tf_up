from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Review
from shop.models import Product

User = get_user_model()


class ReviewUserSerializer(serializers.ModelSerializer):
    """Simple user serializer for reviews"""
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name')


class ProductBasicSerializer(serializers.ModelSerializer):
    """Basic product info for reviews"""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ('id', 'name', 'slug', 'price', 'discount_price', 'image_url')
    
    def get_image_url(self, obj):
        first_image = obj.images.order_by('order').first()
        if first_image:
            return first_image.thumbnail.url if first_image.thumbnail else first_image.image.url
        return None


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviews"""
    user = ReviewUserSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    
    class Meta:
        model = Review
        fields = (
            'id', 'product_id', 'user', 'rating', 'text',
            'reviewer_name', 'is_anonymous', 'display_name',
            'created_at', 'updated_at'
        )
        read_only_fields = ('user', 'display_name', 'created_at', 'updated_at')
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
    
    def validate_text(self, value):
        if len(value) > 1000:
            raise serializers.ValidationError("Review text must be 1000 characters or less.")
        if not value.strip():
            raise serializers.ValidationError("Review text cannot be empty.")
        return value
    
    def validate_reviewer_name(self, value):
        if value and len(value) > 100:
            raise serializers.ValidationError("Reviewer name must be 100 characters or less.")
        return value
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ReviewListSerializer(serializers.ModelSerializer):
    """Simplified serializer for product review list"""
    user = ReviewUserSerializer(read_only=True)
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'display_name', 'rating', 'text', 'is_anonymous', 'created_at')


class ReviewWithProductSerializer(serializers.ModelSerializer):
    """Review with product details for homepage showcase"""
    user = ReviewUserSerializer(read_only=True)
    product = ProductBasicSerializer(read_only=True)
    display_name = serializers.CharField(source='get_display_name', read_only=True)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'product', 'rating', 'text', 'display_name', 'is_anonymous', 'created_at')
