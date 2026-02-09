from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventListView, EventDetailView, EventAdminViewSet, EventImageListView

app_name = 'events'

urlpatterns = [
    path('', EventListView.as_view(), name='event-list'),
    path('images/', EventImageListView.as_view(), name='event-images'),
    path('<slug:slug>/', EventDetailView.as_view(), name='event-detail'),
]

# Admin API endpoints
admin_router = DefaultRouter()
admin_router.register(r'events', EventAdminViewSet, basename='admin-event')

urlpatterns += [
    path('admin/', include(admin_router.urls)),
]
