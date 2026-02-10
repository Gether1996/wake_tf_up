from django.contrib import admin
from .models import ProductEvent, ProductEventStat


@admin.register(ProductEventStat)
class ProductEventStatAdmin(admin.ModelAdmin):
    """Show aggregated statistics of product events"""
    list_display = ('product', 'event_type', 'count', 'last_recorded_at', 'days_tracked')
    list_filter = ('event_type', 'last_recorded_at')
    search_fields = ('product__name',)
    readonly_fields = ('product', 'event_type', 'count', 'first_recorded_at', 'last_recorded_at')
    date_hierarchy = 'last_recorded_at'
    list_per_page = 50
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    fieldsets = (
        ('Product Analytics', {
            'fields': ('product', 'event_type')
        }),
        ('Statistics', {
            'fields': ('count', 'first_recorded_at', 'last_recorded_at')
        }),
    )
    
    def days_tracked(self, obj):
        """Show how many days this event has been tracked"""
        from django.utils import timezone
        delta = timezone.now() - obj.first_recorded_at
        return f"{delta.days} days"
    days_tracked.short_description = 'Tracked For'


# ProductEvent model is not registered in admin
# Individual events are tracked automatically but only aggregated stats are shown
# If you need to see individual events, you can register ProductEventAdmin below:

# @admin.register(ProductEvent)
# class ProductEventAdmin(admin.ModelAdmin):
#     """Individual event records (for detailed analytics if needed)"""
#     list_display = ('product', 'event_type', 'user_or_session', 'created_at')
#     list_filter = ('event_type', 'created_at')
#     search_fields = ('product__name', 'user__email', 'session_id')
#     readonly_fields = ('product', 'event_type', 'user', 'session_id', 'created_at')
#     date_hierarchy = 'created_at'
#     list_per_page = 50
#     
#     def has_add_permission(self, request):
#         return False
#     
#     def has_change_permission(self, request, obj=None):
#         return False
#     
#     def has_delete_permission(self, request, obj=None):
#         return request.user.is_superuser
#     
#     fieldsets = (
#         ('Event Info', {
#             'fields': ('product', 'event_type')
#         }),
#         ('User Info', {
#             'fields': ('user', 'session_id')
#         }),
#         ('Timestamp', {
#             'fields': ('created_at',)
#         }),
#     )
#     
#     def user_or_session(self, obj):
#         if obj.user:
#             return f"User: {obj.user.email}"
#         return f"Session: {obj.session_id[:12]}..."
#     user_or_session.short_description = 'User/Session'
