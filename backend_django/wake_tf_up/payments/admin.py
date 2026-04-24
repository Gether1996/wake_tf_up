from django.contrib import admin
from django.utils.html import format_html
import logging
from .models import PaymentTransaction
from core.seller_access import (
    filter_payment_transactions_for_user,
    is_seller_user,
    seller_can_access_payment_transaction,
)


logger = logging.getLogger(__name__)


class PaymentSellerListFilter(admin.SimpleListFilter):
    title = 'seller'
    parameter_name = 'seller'

    def lookups(self, request, model_admin):
        sellers = model_admin.model.objects.exclude(
            order__items__product__seller__isnull=True
        ).values_list(
            'order__items__product__seller__id',
            'order__items__product__seller__email',
        ).distinct()
        return [(seller_id, email) for seller_id, email in sellers if seller_id]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(order__items__product__seller_id=self.value()).distinct()
        return queryset


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'amount_display', 'payment_method', 'status_badge', 'provider', 'created_at')
    list_filter = (PaymentSellerListFilter, 'status', 'payment_method', 'provider', 'created_at')
    search_fields = ('order__id', 'provider_transaction_id', 'order__user__email')
    readonly_fields = ('created_at', 'updated_at', 'provider_response')
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['mark_as_completed', 'mark_as_failed']

    def has_module_permission(self, request):
        return request.user.is_superuser or is_seller_user(request.user)

    def has_view_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if not is_seller_user(request.user):
            return False
        return obj is None or seller_can_access_payment_transaction(request.user, obj)

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related('order')
        return filter_payment_transactions_for_user(queryset, request.user)

    def get_list_filter(self, request):
        if request.user.is_superuser:
            return self.list_filter
        return tuple(value for value in self.list_filter if value is not PaymentSellerListFilter)

    def get_actions(self, request):
        if request.user.is_superuser:
            return super().get_actions(request)
        return {}
    
    fieldsets = (
        ('Transaction Info', {
            'fields': ('order', 'amount', 'payment_method', 'status', 'provider')
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
        logger.info(
            "Admin user %s marked payment transactions as completed: %s",
            request.user.pk,
            list(queryset.values_list('id', flat=True)),
        )
        queryset.update(status='completed')
    mark_as_completed.short_description = "Mark selected payments as Completed"
    
    def mark_as_failed(self, request, queryset):
        logger.info(
            "Admin user %s marked payment transactions as failed: %s",
            request.user.pk,
            list(queryset.values_list('id', flat=True)),
        )
        queryset.update(status='failed')
    mark_as_failed.short_description = "Mark selected payments as Failed"
