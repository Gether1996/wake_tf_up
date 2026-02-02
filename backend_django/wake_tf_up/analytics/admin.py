from django.contrib import admin
from .models import ProductEvent


@admin.register(ProductEvent)
class ProductEventAdmin(admin.ModelAdmin):
    list_display = ('product', 'event_type', 'user_or_session', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('product__name', 'user__email', 'session_id')
    readonly_fields = ('product', 'event_type', 'user', 'session_id', 'created_at')
    date_hierarchy = 'created_at'
    list_per_page = 50
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    fieldsets = (
        ('Event Info', {
            'fields': ('product', 'event_type')
        }),
        ('User Info', {
            'fields': ('user', 'session_id')
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    def user_or_session(self, obj):
        if obj.user:
            return f"User: {obj.user.email}"
        return f"Session: {obj.session_id[:12]}..."
    user_or_session.short_description = 'User/Session'
