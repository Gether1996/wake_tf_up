from rest_framework import generics, permissions, viewsets, filters
from .models import BlogPost
from .serializers import BlogPostListSerializer, BlogPostDetailSerializer


class IsSuperuser(permissions.BasePermission):
    """Custom permission to only allow superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class BlogPostListView(generics.ListAPIView):
    """
    List all published blog posts.
    GET /api/v1/blog/
    """
    queryset = BlogPost.objects.filter(is_published=True)
    serializer_class = BlogPostListSerializer
    permission_classes = [permissions.AllowAny]


class BlogPostDetailView(generics.RetrieveAPIView):
    """
    Get blog post details by slug.
    GET /api/v1/blog/{slug}/
    """
    queryset = BlogPost.objects.filter(is_published=True)
    serializer_class = BlogPostDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


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
