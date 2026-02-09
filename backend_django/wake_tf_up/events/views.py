from rest_framework import generics, permissions, viewsets, filters
from .models import Event, EventImage
from .serializers import EventListSerializer, EventDetailSerializer, EventImageSerializer


class IsSuperuser(permissions.BasePermission):
    """Custom permission to only allow superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class EventListView(generics.ListAPIView):
    """
    List all published events.
    GET /api/v1/events/
    """
    queryset = Event.objects.filter(is_published=True)
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]


class EventDetailView(generics.RetrieveAPIView):
    """
    Get event details by slug.
    GET /api/v1/events/{slug}/
    """
    queryset = Event.objects.filter(is_published=True)
    serializer_class = EventDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class EventImageListView(generics.ListAPIView):
    """
    List all event images (for admin use in content creation).
    GET /api/v1/events/images/
    """
    queryset = EventImage.objects.all().order_by('-created_at')
    serializer_class = EventImageSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'alt_text', 'caption']
    ordering_fields = ['created_at', 'title']


# ============ ADMIN CRUD ENDPOINTS ============

class EventAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD operations for events.
    GET    /api/v1/events/admin/events/       - List all events
    POST   /api/v1/events/admin/events/       - Create event
    GET    /api/v1/events/admin/events/{id}/  - Get event
    PUT    /api/v1/events/admin/events/{id}/  - Update event
    PATCH  /api/v1/events/admin/events/{id}/  - Partial update
    DELETE /api/v1/events/admin/events/{id}/  - Delete event
    """
    queryset = Event.objects.all()
    serializer_class = EventDetailSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'slug', 'content_html', 'place']
    filterset_fields = ['is_published']
    ordering = ['-datetime']
