from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import MainSettings
from .serializers import MainSettingsSerializer


class MainSettingsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly ViewSet for MainSettings.
    Only exposes GET methods - settings can only be changed via Django admin.
    """
    queryset = MainSettings.objects.all()
    serializer_class = MainSettingsSerializer
    permission_classes = [permissions.AllowAny]  # Public settings
    
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
    
    @action(detail=False, methods=['get'])
    def shipping(self, request):
        """Get only shipping-related settings"""
        settings = MainSettings.get_settings()
        return Response({
            'free_shipping_threshold': settings.free_shipping_threshold,
            'standard_shipping_cost': settings.standard_shipping_cost,
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
