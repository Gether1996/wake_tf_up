from django.contrib import admin
from .models import MainSettings


@admin.register(MainSettings)
class MainSettingsAdmin(admin.ModelAdmin):
    """Admin interface for MainSettings - single instance only"""
    
    fieldsets = (
        ('Shipping Settings', {
            'fields': ('free_shipping_threshold',),
            'description': 'Configure free shipping threshold and delivery method costs'
        }),
        ('Shipping Method Costs', {
            'fields': (
                'pickup_cost',
                'dpd_courier_cost', 
                'packeta_box_cost',
                'packeta_courier_cost'
            ),
            'description': 'Set costs for different shipping methods (EUR)'
        }),
        ('Tax Settings', {
            'fields': ('tax_rate',)
        }),
        ('General Settings', {
            'fields': ('site_name', 'owner_name', 'company_id', 'tax_id', 'contact_email', 'phone', 'address', 'country')
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
        ('Newsletter Settings', {
            'fields': ('newsletter_popup_enabled', 'newsletter_popup_delay'),
            'classes': ('collapse',)
        }),
        ('Review Email Settings', {
            'fields': ('review_email_days_after_delivery',),
            'description': 'Configure automatic review request emails after order delivery'
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
