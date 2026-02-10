import logging
from rest_framework import generics, permissions, status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Order
from .serializers import (
    OrderCreateSerializer,
    OrderListSerializer,
    OrderDetailSerializer
)
from .emails import send_order_confirmation_email

logger = logging.getLogger(__name__)


class IsSuperuser(permissions.BasePermission):
    """Custom permission to only allow superusers."""
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class OrderCreateView(generics.CreateAPIView):
    """
    Create a new order.
    POST /api/v1/orders/
    """
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            order = serializer.save()
            # Get language from request data or LANGUAGE_CODE header
            language = request.data.get('language') or getattr(request, 'LANGUAGE_CODE', 'sk')
            logger.info(f"Creating order {order.id} - language from request.data: {request.data.get('language')}, LANGUAGE_CODE: {getattr(request, 'LANGUAGE_CODE', None)}, using: {language}")
            try:
                send_order_confirmation_email(order, language=language)
            except Exception as email_error:
                logger.error("Failed to send order confirmation email for order %s: %s", order.id, email_error)
            return Response(
                OrderDetailSerializer(order).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class OrderListView(generics.ListAPIView):
    """
    List user's orders.
    GET /api/v1/orders/
    """
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')


class OrderDetailView(generics.RetrieveAPIView):
    """
    Get order details.
    GET /api/v1/orders/{id}/
    """
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related(
            'items__product__category',
            'items__product__color'
        )


# ============ ADMIN ENDPOINTS ============

class OrderAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-only operations for orders.
    GET    /api/v1/orders/admin/orders/       - List all orders
    GET    /api/v1/orders/admin/orders/{id}/  - Get order
    PUT    /api/v1/orders/admin/orders/{id}/  - Update order
    PATCH  /api/v1/orders/admin/orders/{id}/  - Partial update (status change)
    DELETE /api/v1/orders/admin/orders/{id}/  - Delete order
    
    Actions:
    POST /api/v1/orders/admin/orders/{id}/update_status/ - Update order status
    """
    queryset = Order.objects.all().select_related('user').prefetch_related('items__product')
    serializer_class = OrderDetailSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['id', 'user__email', 'shipping_name', 'phone']
    filterset_fields = ['status', 'created_at']
    ordering = ['-created_at']
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update order status.
        POST /api/v1/orders/admin/orders/{id}/update_status/
        Body: {"status": "paid"|"shipped"|"delivered"|"cancelled"|"refunded"}
        """
        order = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'Status is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        valid_statuses = ['created', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = new_status
        order.save()
        
        return Response(
            OrderDetailSerializer(order).data,
            status=status.HTTP_200_OK
        )
