from django.contrib import admin
from django.utils.html import format_html
from .models import Subscriber


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ('email', 'status_badge', 'subscribed_at', 'unsubscribed_at')
    list_filter = ('is_active', 'subscribed_at')
    search_fields = ('email',)
    readonly_fields = ('subscribed_at', 'unsubscribed_at')
    date_hierarchy = 'subscribed_at'
    list_per_page = 50
    actions = ['activate_subscribers', 'deactivate_subscribers']
    
    def status_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: green; font-weight: bold;">● Active</span>'
            )
        return format_html(
            '<span style="color: red;">● Unsubscribed</span>'
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'is_active'
    
    # Actions
    def activate_subscribers(self, request, queryset):
        queryset.update(is_active=True, unsubscribed_at=None)
    activate_subscribers.short_description = "Activate selected subscribers"
    
    def deactivate_subscribers(self, request, queryset):
        from datetime import datetime
        queryset.update(is_active=False, unsubscribed_at=datetime.now())
    deactivate_subscribers.short_description = "Deactivate selected subscribers"
