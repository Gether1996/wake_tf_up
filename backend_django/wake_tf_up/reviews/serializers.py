from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Review

User = get_user_model()


class ReviewUserSerializer(serializers.ModelSerializer):
    """Simple user serializer for reviews"""
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name')


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer for reviews"""
    user = ReviewUserSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Review
        fields = (
            'id', 'product_id', 'user', 'rating', 'text',
            'created_at', 'updated_at'
        )
        read_only_fields = ('user', 'created_at', 'updated_at')
    
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ReviewListSerializer(serializers.ModelSerializer):
    """Simplified serializer for product review list"""
    user = ReviewUserSerializer(read_only=True)
    
    class Meta:
        model = Review
        fields = ('id', 'user', 'rating', 'text', 'created_at')
