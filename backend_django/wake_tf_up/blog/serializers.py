from rest_framework import serializers
from .models import BlogPost, BlogImage


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
    image_url = serializers.SerializerMethodField()
    filename = serializers.ReadOnlyField()
    
    class Meta:
        model = BlogImage
        fields = (
            'id', 'title', 'image', 'image_url', 'alt_text', 
            'caption', 'filename', 'created_at'
        )
    
    def get_image_url(self, obj):
        """Get absolute URL for the image"""
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        elif obj.image:
            return obj.image.url
        return None
