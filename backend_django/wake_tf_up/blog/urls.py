from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BlogPostListView, BlogPostDetailView, BlogPostAdminViewSet, BlogImageListView

app_name = 'blog'

urlpatterns = [
    path('', BlogPostListView.as_view(), name='blog-list'),
    path('images/', BlogImageListView.as_view(), name='blog-images'),
    path('<slug:slug>/', BlogPostDetailView.as_view(), name='blog-detail'),
]

# Admin API endpoints
admin_router = DefaultRouter()
admin_router.register(r'posts', BlogPostAdminViewSet, basename='admin-blogpost')

urlpatterns += [
    path('admin/', include(admin_router.urls)),
]
