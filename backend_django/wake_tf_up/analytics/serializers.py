from rest_framework import serializers
from .models import ProductEvent


class ProductEventSerializer(serializers.ModelSerializer):
    """Serializer for creating product events"""
    class Meta:
        model = ProductEvent
        fields = ('product', 'event_type', 'session_id')
        
    def create(self, validated_data):
        # Add user if authenticated
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        return super().create(validated_data)
