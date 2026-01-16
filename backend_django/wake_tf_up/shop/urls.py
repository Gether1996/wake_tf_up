from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductListView,
    ProductDetailView,
    CategoryListView,
    ColorListView,
    ProductAdminViewSet,
    CategoryAdminViewSet,
    ColorAdminViewSet,
)

app_name = 'shop'

# Public API endpoints
urlpatterns = [
    path('products/', ProductListView.as_view(), name='product-list'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('colors/', ColorListView.as_view(), name='color-list'),
]

# Admin API endpoints (CRUD)
admin_router = DefaultRouter()
admin_router.register(r'products', ProductAdminViewSet, basename='admin-product')
admin_router.register(r'categories', CategoryAdminViewSet, basename='admin-category')
admin_router.register(r'colors', ColorAdminViewSet, basename='admin-color')

urlpatterns += [
    path('admin/', include(admin_router.urls)),
]
