from rest_framework import serializers
from .models import BlogPost


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
