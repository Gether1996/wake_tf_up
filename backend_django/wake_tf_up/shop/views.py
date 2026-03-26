from rest_framework import generics, filters, viewsets, permissions
from django.db.models import Sum, Q, Value
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, Category, Color, Ticket
from .serializers import (
    ProductListSerializer,
    ProductDetailSerializer,
    CategorySerializer,
    ColorSerializer,
    ProductAdminSerializer,
    CategoryAdminSerializer,
    ColorAdminSerializer,
    TicketListSerializer,
    TicketDetailSerializer,
    TicketAdminSerializer,
)


from core.permissions import IsSuperuser


class ProductListView(generics.ListAPIView):
    """
    List all published products with filters.
    GET /api/v1/products/
    
    Filters: category, color, price_min, price_max, in_stock, pre_order
    """
    serializer_class = ProductListSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['price', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        # Superadmins can see all products including unpublished
        is_superadmin = (
            self.request.user.is_authenticated and self.request.user.is_superuser
        )
        if is_superadmin:
            queryset = Product.objects.all().select_related('category', 'color')
        else:
            queryset = Product.objects.filter(is_published=True).select_related('category', 'color')

        # Annotate reserved quantity to avoid N+1 queries for available_stock
        queryset = queryset.annotate(
            _reserved_qty=Coalesce(
                Sum(
                    'order_items__quantity',
                    filter=Q(order_items__order__status__in=['created', 'paid', 'shipped'])
                ),
                Value(0)
            )
        )

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Filter by color
        color = self.request.query_params.get('color')
        if color:
            queryset = queryset.filter(color__id=color)
        
        # Filter by price range
        price_min = self.request.query_params.get('price_min')
        if price_min:
            queryset = queryset.filter(price__gte=price_min)
        
        price_max = self.request.query_params.get('price_max')
        if price_max:
            queryset = queryset.filter(price__lte=price_max)
        
        # Filter by stock status
        in_stock = self.request.query_params.get('in_stock')
        if in_stock and in_stock.lower() == 'true':
            queryset = queryset.filter(total_stock__gt=0)
        
        # Filter by pre-order enabled
        pre_order = self.request.query_params.get('pre_order')
        if pre_order:
            queryset = queryset.filter(pre_order_enabled=pre_order.lower() == 'true')
        
        # Filter by limited drop
        is_limited_drop = self.request.query_params.get('is_limited_drop')
        if is_limited_drop:
            queryset = queryset.filter(is_limited_drop=is_limited_drop.lower() == 'true')
        
        # Filter by recycled
        is_recycled = self.request.query_params.get('is_recycled')
        if is_recycled:
            queryset = queryset.filter(is_recycled=is_recycled.lower() == 'true')
        
        return queryset


class ProductDetailView(generics.RetrieveAPIView):
    """
    Get product details by slug.
    GET /api/v1/products/{slug}/
    """
    serializer_class = ProductDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        is_superadmin = (
            self.request.user.is_authenticated and self.request.user.is_superuser
        )
        if is_superadmin:
            return Product.objects.all().select_related('category', 'color')
        return Product.objects.filter(is_published=True).select_related('category', 'color')


class CategoryListView(generics.ListAPIView):
    """
    List all categories.
    GET /api/v1/categories/
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = None


class ColorListView(generics.ListAPIView):
    """
    List all colors.
    GET /api/v1/colors/
    """
    queryset = Color.objects.all()
    serializer_class = ColorSerializer
    pagination_class = None


# ============ ADMIN CRUD ENDPOINTS ============

class ProductAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD operations for products.
    GET    /api/v1/admin/products/       - List all products
    POST   /api/v1/admin/products/       - Create product
    GET    /api/v1/admin/products/{id}/  - Get product
    PUT    /api/v1/admin/products/{id}/  - Update product
    PATCH  /api/v1/admin/products/{id}/  - Partial update
    DELETE /api/v1/admin/products/{id}/  - Delete product
    """
    queryset = Product.objects.all().select_related('category', 'color')
    serializer_class = ProductAdminSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug', 'description']
    filterset_fields = ['category', 'color', 'is_published', 'pre_order_enabled']
    ordering_fields = ['price', 'created_at', 'name']
    ordering = ['-created_at']


class CategoryAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD operations for categories.
    """
    queryset = Category.objects.all()
    serializer_class = CategoryAdminSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug']
    ordering = ['name']


class ColorAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD operations for colors.
    """
    queryset = Color.objects.all()
    serializer_class = ColorAdminSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'hex_code']


# ============ TICKET PUBLIC ENDPOINTS ============

class TicketListView(generics.ListAPIView):
    """
    List all published tickets.
    GET /api/v1/tickets/
    """
    serializer_class = TicketListSerializer
    pagination_class = None  # return plain array, no pagination needed

    def get_queryset(self):
        is_superadmin = (
            self.request.user.is_authenticated and self.request.user.is_superuser
        )
        if is_superadmin:
            return Ticket.objects.all()
        return Ticket.objects.filter(is_published=True)


class TicketDetailView(generics.RetrieveAPIView):
    """
    Get ticket details by slug.
    GET /api/v1/tickets/{slug}/
    """
    serializer_class = TicketDetailSerializer
    lookup_field = 'slug'

    def get_queryset(self):
        is_superadmin = (
            self.request.user.is_authenticated and self.request.user.is_superuser
        )
        if is_superadmin:
            return Ticket.objects.all()
        return Ticket.objects.filter(is_published=True)


class TicketAdminViewSet(viewsets.ModelViewSet):
    """
    Admin-only CRUD operations for tickets.
    """
    queryset = Ticket.objects.all()
    serializer_class = TicketAdminSerializer
    permission_classes = [IsSuperuser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug', 'description', 'event_location']
    ordering_fields = ['price', 'created_at', 'event_date', 'name']
    ordering = ['-created_at']
