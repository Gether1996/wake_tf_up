from rest_framework import serializers
from .models import BlogPost, BlogImage


class RelativeImageField(serializers.ImageField):
    """Custom ImageField that returns relative URLs instead of absolute"""
    def to_representation(self, value):
        if not value:
            return None
        # Return relative URL path (nginx handles the domain)
        return value.url


class BlogPostListSerializer(serializers.ModelSerializer):
    """Serializer for blog post list"""
    class Meta:
        model = BlogPost
        fields = ('id', 'title', 'slug', 'excerpt', 'author', 'created_at')


class BlogPostDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for blog post"""
    class Meta:
        model = BlogPost
        fields = (
            'id', 'title', 'slug', 'content_html', 'excerpt', 'author',
            'created_at', 'updated_at'
        )


class BlogImageSerializer(serializers.ModelSerializer):
    """Serializer for blog images"""
    image = RelativeImageField()
    image_url = serializers.SerializerMethodField()
    filename = serializers.ReadOnlyField()
    
    class Meta:
        model = BlogImage
        fields = (
            'id', 'title', 'image', 'image_url', 'alt_text', 
            'caption', 'filename', 'created_at'
        )
    
    def get_image_url(self, obj):
        """Get relative URL for the image (Nginx handles domain)"""
        if obj.image:
            return obj.image.url
        return None
