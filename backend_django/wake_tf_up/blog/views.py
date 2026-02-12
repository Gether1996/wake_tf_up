from rest_framework import generics, permissions, viewsets, filters
from .models import BlogPost, BlogImage
from .serializers import BlogPostListSerializer, BlogPostDetailSerializer, BlogImageSerializer


class IsSuperuser(permissions.BasePermission):
    """Custom permission to only allow superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class BlogPostListView(generics.ListAPIView):
    """
    List all published blog posts (or all posts for superusers).
    GET /api/v1/blog/
    """
    serializer_class = BlogPostListSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        """Show unpublished posts to superusers"""
        if self.request.user.is_authenticated and self.request.user.is_superuser:
            return BlogPost.objects.all()
        return BlogPost.objects.filter(is_published=True)


class BlogPostDetailView(generics.RetrieveAPIView):
    """
    Get blog post details by slug (or unpublished for superusers).
    GET /api/v1/blog/{slug}/
    """
    serializer_class = BlogPostDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    
    def get_queryset(self):
        """Show unpublished posts to superusers"""
        if self.request.user.is_authenticated and self.request.user.is_superuser:
            return BlogPost.objects.all()
        return BlogPost.objects.filter(is_published=True)


class BlogImageListView(generics.ListAPIView):
    """
    List all blog images (for admin use in content creation).
    GET /api/v1/blog/images/
    """
    queryset = BlogImage.objects.all().order_by('-created_at')
    serializer_class = BlogImageSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'alt_text', 'caption']
    ordering_fields = ['created_at', 'title']


# ============ ADMIN CRUD ENDPOINTS ============

class BlogPostAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD operations for blog posts.
    GET    /api/v1/blog/admin/posts/       - List all posts
    POST   /api/v1/blog/admin/posts/       - Create post
    GET    /api/v1/blog/admin/posts/{id}/  - Get post
    PUT    /api/v1/blog/admin/posts/{id}/  - Update post
    PATCH  /api/v1/blog/admin/posts/{id}/  - Partial update
    DELETE /api/v1/blog/admin/posts/{id}/  - Delete post
    """
    queryset = BlogPost.objects.all()
    serializer_class = BlogPostDetailSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'slug', 'content_html']
    filterset_fields = ['is_published']
    ordering = ['-created_at']
