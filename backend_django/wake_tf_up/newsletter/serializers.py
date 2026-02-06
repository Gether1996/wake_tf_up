from rest_framework import serializers
from .models import Subscriber, NewsletterPopupStat, NewsletterImage


class RelativeImageField(serializers.ImageField):
    """Custom ImageField that returns relative URLs instead of absolute"""
    def to_representation(self, value):
        if not value:
            return None
        # Return relative URL path (nginx handles the domain)
        return value.url


class SubscriberSerializer(serializers.ModelSerializer):
    """Serializer for newsletter subscription"""
    class Meta:
        model = Subscriber
        fields = ('email',)
        # Don't validate unique constraint in serializer - we handle it manually in the view
        extra_kwargs = {
            'email': {'validators': []},
        }


class NewsletterPopupStatSerializer(serializers.ModelSerializer):
    """Serializer for tracking newsletter popup interactions"""
    class Meta:
        model = NewsletterPopupStat
        fields = ('session_id', 'email', 'action', 'ip_address', 'user_agent')
        extra_kwargs = {
            'session_id': {'required': False},
            'email': {'required': False},
            'action': {'required': False},
            'ip_address': {'required': False},
            'user_agent': {'required': False},
        }


class NewsletterImageSerializer(serializers.ModelSerializer):
    """Serializer for newsletter images"""
    image = RelativeImageField()
    image_url = serializers.SerializerMethodField()
    filename = serializers.ReadOnlyField()
    
    class Meta:
        model = NewsletterImage
        fields = (
            'id', 'title', 'image', 'image_url', 'alt_text', 
            'caption', 'filename', 'created_at'
        )
    
    def get_image_url(self, obj):
        """Get relative URL for the image (Nginx handles domain)"""
        if obj.image:
            return obj.image.url
        return None
