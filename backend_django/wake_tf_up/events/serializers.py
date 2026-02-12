from rest_framework import serializers
from .models import Event, EventImage


class RelativeImageField(serializers.ImageField):
    """Custom ImageField that returns relative URLs instead of absolute"""
    def to_representation(self, value):
        if not value:
            return None
        # Return relative URL path (nginx handles the domain)
        return value.url


class EventListSerializer(serializers.ModelSerializer):
    """Serializer for event list"""
    class Meta:
        model = Event
        fields = ('id', 'title', 'slug', 'excerpt', 'author', 'datetime', 'place', 'is_published', 'created_at')


class EventDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for event"""
    class Meta:
        model = Event
        fields = (
            'id', 'title', 'slug', 'content_html', 'excerpt', 'author',
            'datetime', 'place', 'is_published', 'created_at', 'updated_at'
        )


class EventImageSerializer(serializers.ModelSerializer):
    """Serializer for event images"""
    image = RelativeImageField()
    image_url = serializers.SerializerMethodField()
    filename = serializers.ReadOnlyField()
    
    class Meta:
        model = EventImage
        fields = (
            'id', 'title', 'image', 'image_url', 'alt_text', 
            'caption', 'filename', 'created_at'
        )
    
    def get_image_url(self, obj):
        """Get relative URL for the image (Nginx handles domain)"""
        if obj.image:
            return obj.image.url
        return None
