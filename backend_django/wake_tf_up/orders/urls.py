from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderCreateView, OrderListView, OrderDetailView, OrderAdminViewSet

app_name = 'orders'

urlpatterns = [
    path('', OrderListView.as_view(), name='order-list'),
    path('create/', OrderCreateView.as_view(), name='order-create'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
]

# Admin API endpoints
admin_router = DefaultRouter()
admin_router.register(r'orders', OrderAdminViewSet, basename='admin-order')

urlpatterns += [
    path('admin/', include(admin_router.urls)),
]
