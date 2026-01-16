from django.contrib import admin
from django.utils.html import format_html
from .models import PaymentTransaction


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'amount_display', 'status_badge', 'provider', 'created_at')
    list_filter = ('status', 'provider', 'created_at')
    search_fields = ('order__id', 'provider_transaction_id', 'order__user__email')
    readonly_fields = ('created_at', 'updated_at', 'provider_response')
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['mark_as_completed', 'mark_as_failed']
    
    fieldsets = (
        ('Transaction Info', {
            'fields': ('order', 'amount', 'status', 'provider')
        }),
        ('Provider Details', {
            'fields': ('provider_transaction_id', 'provider_response')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def amount_display(self, obj):
        return f"€{obj.amount}"
    amount_display.short_description = 'Amount'
    amount_display.admin_order_field = 'amount'
    
    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'completed': 'green',
            'failed': 'red',
            'refunded': 'blue',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">● {}</span>',
            color, obj.status.upper()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'
    
    # Actions
    def mark_as_completed(self, request, queryset):
        queryset.update(status='completed')
    mark_as_completed.short_description = "Mark selected payments as Completed"
    
    def mark_as_failed(self, request, queryset):
        queryset.update(status='failed')
    mark_as_failed.short_description = "Mark selected payments as Failed"
