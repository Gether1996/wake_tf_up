import logging
from django.http import Http404
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
from .access import has_valid_guest_order_access

logger = logging.getLogger(__name__)


from core.permissions import IsSuperuserOrSeller
from core.seller_access import filter_orders_for_user, is_seller_user, seller_can_manage_order


class OrderCreateView(generics.CreateAPIView):
    """
    Create a new order.
    POST /api/v1/orders/
    """
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        logger.info("Order create attempt - user: %s, data keys: %s",
                    getattr(request.user, 'id', 'guest'), list(request.data.keys()))
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.error("Order serializer validation failed: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            order = serializer.save()
            # Get language from request data or LANGUAGE_CODE header
            language = request.data.get('language') or getattr(request, 'LANGUAGE_CODE', 'sk')
            logger.info(f"Creating order {order.id} - language from request.data: {request.data.get('language')}, LANGUAGE_CODE: {getattr(request, 'LANGUAGE_CODE', None)}, using: {language}")
            # Save language to order
            order.language = language
            order.save()
            try:
                send_order_confirmation_email(order, language=language)
            except Exception as email_error:
                logger.error("Failed to send order confirmation email for order %s: %s", order.id, email_error)
            return Response(
                OrderDetailSerializer(order, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error("Order creation failed: %s", e, exc_info=True)
            from django.core.exceptions import ValidationError as DjangoValidationError
            if isinstance(e, DjangoValidationError):
                msg = e.messages[0] if hasattr(e, 'messages') and e.messages else str(e)
            else:
                msg = str(e)
            return Response(
                {'error': msg},
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
        return Order.objects.filter(user=self.request.user).prefetch_related(
            'items__product',
            'items__ticket',
        )


class OrderDetailView(generics.RetrieveAPIView):
    """
    Get order details.
    GET /api/v1/orders/{id}/
    """
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Order.objects.prefetch_related(
            'items__product__category',
            'items__product__color'
        )

    def get_object(self):
        order = generics.get_object_or_404(self.get_queryset(), pk=self.kwargs['pk'])

        if self.request.user.is_authenticated:
            if order.user_id != self.request.user.id:
                raise Http404
            return order

        if order.user_id is not None:
            raise Http404

        access_token = self.request.query_params.get('access_token')
        if not has_valid_guest_order_access(order, access_token):
            raise Http404

        return order


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
    queryset = Order.objects.all().select_related('user').prefetch_related('items__product__seller', 'items__ticket')
    serializer_class = OrderDetailSerializer
    permission_classes = [IsSuperuserOrSeller]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['id', 'user__email', 'shipping_name', 'phone']
    filterset_fields = ['status', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        return filter_orders_for_user(queryset, self.request.user)

    def update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can edit full orders.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Only superusers can edit full orders.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            order = self.get_object()
            logger.warning(
                "Non-superuser %s (id=%s) denied deleting order #%s",
                request.user.email,
                request.user.id,
                order.id,
            )
            return Response({'error': 'Only superusers can delete orders.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Update order status.
        POST /api/v1/orders/admin/orders/{id}/update_status/
        Body: {"status": "paid"|"shipped"|"delivered"|"cancelled"|"refunded"}
        """
        order = self.get_object()
        new_status = request.data.get('status')

        if is_seller_user(request.user) and not seller_can_manage_order(request.user, order):
            return Response(
                {
                    'error': 'Seller can update status only for orders containing exclusively their own products.'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        if is_seller_user(request.user) and not request.user.is_superuser:
            allowed_statuses = {'shipped', 'delivered'}
            if new_status not in allowed_statuses:
                return Response(
                    {
                        'error': 'Seller can update status only to shipped or delivered.'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
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
        
        was_already_paid = order.status == 'paid'
        order.status = new_status
        order.save(update_fields=['status'])
        if new_status == 'paid' and not was_already_paid:
            order.mark_paid_discount_usage()

        return Response(
            OrderDetailSerializer(order, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK
        )
