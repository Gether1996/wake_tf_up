from django.contrib import admin
from django.utils.html import format_html
from datetime import datetime
from .models import DiscountCode


@admin.register(DiscountCode)
class DiscountCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'user_email', 'discount_percentage', 'code_type', 'status_badge', 'valid_until')
    list_filter = ('code_type', 'is_active', 'is_used', 'created_at')
    search_fields = ('code', 'user__email')
    readonly_fields = ('created_at', 'used_at')
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['activate_codes', 'deactivate_codes', 'mark_as_unused', 'extend_validity']
    
    fieldsets = (
        ('Code Info', {
            'fields': ('code', 'user', 'discount_percentage', 'code_type')
        }),
        ('Status', {
            'fields': ('is_active', 'is_used')
        }),
        ('Validity', {
            'fields': ('valid_from', 'valid_until')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'used_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def status_badge(self, obj):
        if obj.is_used:
            return format_html('<span style="color: gray;">● Used</span>')
        elif not obj.is_active:
            return format_html('<span style="color: red;">● Inactive</span>')
        elif obj.valid_until < datetime.now():
            return format_html('<span style="color: orange;">● Expired</span>')
        else:
            return format_html('<span style="color: green; font-weight: bold;">● Active</span>')
    status_badge.short_description = 'Status'
    
    # Actions
    def activate_codes(self, request, queryset):
        queryset.update(is_active=True)
    activate_codes.short_description = "Activate selected codes"
    
    def deactivate_codes(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_codes.short_description = "Deactivate selected codes"
    
    def mark_as_unused(self, request, queryset):
        queryset.update(is_used=False, used_at=None)
    mark_as_unused.short_description = "Mark selected codes as Unused"
    
    def extend_validity(self, request, queryset):
        from datetime import timedelta
        for code in queryset:
            code.valid_until = datetime.now() + timedelta(days=30)
            code.save()
    extend_validity.short_description = "Extend validity by 30 days"
