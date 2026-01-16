from django.contrib import admin
from .models import MainSettings


@admin.register(MainSettings)
class MainSettingsAdmin(admin.ModelAdmin):
    """Admin interface for MainSettings - single instance only"""
    
    fieldsets = (
        ('Shipping Settings', {
            'fields': ('free_shipping_threshold', 'standard_shipping_cost')
        }),
        ('Tax Settings', {
            'fields': ('tax_rate',)
        }),
        ('General Settings', {
            'fields': ('site_name', 'contact_email')
        }),
        ('Social Media', {
            'fields': ('instagram_url', 'facebook_url', 'twitter_url'),
            'classes': ('collapse',)
        }),
        ('Cart Settings', {
            'fields': ('max_cart_quantity',)
        }),
        ('Maintenance Mode', {
            'fields': ('maintenance_mode', 'maintenance_message'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def has_add_permission(self, request):
        """Only allow one instance"""
        return not MainSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of settings"""
        return False
    
    def changelist_view(self, request, extra_context=None):
        """Redirect to the single instance edit page"""
        settings = MainSettings.get_settings()
        from django.shortcuts import redirect
        return redirect('admin:settings_mainsettings_change', settings.pk)
