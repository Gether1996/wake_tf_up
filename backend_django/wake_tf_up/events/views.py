from rest_framework import generics, permissions, viewsets, filters
from core.permissions import IsSuperuser
from .models import Event, EventImage
from .serializers import EventListSerializer, EventDetailSerializer, EventImageSerializer


class EventListView(generics.ListAPIView):
    """
    List all published events (or all events for superusers).
    GET /api/v1/events/
    """
    serializer_class = EventListSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        """Show unpublished events to superusers"""
        if self.request.user.is_authenticated and self.request.user.is_superuser:
            return Event.objects.all()
        return Event.objects.filter(is_published=True)


class EventDetailView(generics.RetrieveAPIView):
    """
    Get event details by slug (or unpublished for superusers).
    GET /api/v1/events/{slug}/
    """
    serializer_class = EventDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    
    def get_queryset(self):
        """Show unpublished events to superusers"""
        if self.request.user.is_authenticated and self.request.user.is_superuser:
            return Event.objects.all()
        return Event.objects.filter(is_published=True)


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
