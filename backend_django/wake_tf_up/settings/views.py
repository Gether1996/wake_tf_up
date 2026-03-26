from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import MainSettings
from .serializers import MainSettingsSerializer


class IsAdminUser(permissions.BasePermission):
    """Custom permission: GET is public (except packeta_key), mutations require superuser."""
    message = "Only admin users can modify settings."

    def has_permission(self, request, view):
        action = getattr(view, 'action', None)
        # Packeta key is sensitive — always require superuser
        if action == 'packeta_key':
            return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
        # Allow GET requests for public settings
        if request.method == 'GET':
            return True
        # Mutations require superuser
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class MainSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MainSettings.
    GET: Public access to all settings (no authentication required)
    PUT/PATCH: Admin only - update settings
    """
    queryset = MainSettings.objects.all()
    serializer_class = MainSettingsSerializer
    permission_classes = [IsAdminUser]
    
    def get_authenticators(self):
        """
        Skip authentication for GET requests (public settings).
        Packeta key endpoint keeps authentication to protect sensitive data.
        """
        if self.request.method == 'GET':
            # Keep auth for packeta_key to allow permission check
            if self.request.path.rstrip('/').endswith('packeta-key'):
                return super().get_authenticators()
            return []
        return super().get_authenticators()
    
    def list(self, request, *args, **kwargs):
        """Return the single settings instance"""
        settings = MainSettings.get_settings()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    def retrieve(self, request, *args, **kwargs):
        """Return the single settings instance (ignore pk)"""
        settings = MainSettings.get_settings()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """Update settings - admin only"""
        settings = MainSettings.get_settings()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """Partial update settings - admin only"""
        return self.update(request, *args, partial=True, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deletion"""
        return Response(
            {'detail': 'Settings cannot be deleted.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    @action(detail=False, methods=['get'])
    def shipping(self, request):
        """Get shipping-related settings"""
        settings = MainSettings.get_settings()
        return Response({
            'free_shipping_threshold': settings.free_shipping_threshold,
            'pickup_cost': settings.pickup_cost,
            'dpd_courier_cost': settings.dpd_courier_cost,
            'packeta_box_cost': settings.packeta_box_cost,
            'packeta_courier_cost': settings.packeta_courier_cost,
        })
    
    @action(detail=False, methods=['get'])
    def cart(self, request):
        """Get only cart-related settings"""
        settings = MainSettings.get_settings()
        return Response({
            'max_cart_quantity': settings.max_cart_quantity,
            'free_shipping_threshold': settings.free_shipping_threshold,
            'standard_shipping_cost': settings.standard_shipping_cost,
        })
    
    @action(detail=False, methods=['get'])
    def packeta_key(self, request):
        """Get Packeta API key from environment"""
        from django.conf import settings as django_settings
        return Response({
            'api_key': django_settings.PACKETA_API_KEY
        })
