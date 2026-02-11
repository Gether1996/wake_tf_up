from rest_framework import serializers
from .models import ProductEvent


class ProductEventSerializer(serializers.ModelSerializer):
    """Serializer for creating product events (anonymous, no session tracking)"""
    class Meta:
        model = ProductEvent
        fields = ('product', 'event_type')
        
    def create(self, validated_data):
        # Add user if authenticated
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        return super().create(validated_data)
