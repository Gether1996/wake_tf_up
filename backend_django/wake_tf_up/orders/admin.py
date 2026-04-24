from django.contrib import admin
from django.contrib import messages
from django.db import transaction
from django.utils.html import format_html
from django.urls import path
from django.http import HttpResponseRedirect
from datetime import datetime
import logging
from .models import Order, OrderItem, PurchasedTicket
from .packeta_service import PacketaService, PacketaAPIError
from core.admin_mixins import SellerHiddenAdminMixin
from core.seller_access import (
    filter_orders_for_user,
    is_seller_user,
    seller_can_access_order,
    seller_can_manage_order,
)


logger = logging.getLogger(__name__)


class OrderSellerListFilter(admin.SimpleListFilter):
    title = 'seller'
    parameter_name = 'seller'

    def lookups(self, request, model_admin):
        sellers = model_admin.model.objects.exclude(
            items__product__seller__isnull=True
        ).values_list(
            'items__product__seller__id',
            'items__product__seller__email',
        ).distinct()
        return [(seller_id, email) for seller_id, email in sellers if seller_id]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(items__product__seller_id=self.value()).distinct()
        return queryset


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'ticket', 'price_at_purchase', 'is_pre_order', 'subtotal')
    fields = ('product', 'ticket', 'quantity', 'price_at_purchase', 'is_pre_order', 'subtotal')
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        # Prevent adding items through admin - use API instead
        return False

    def has_view_or_change_permission(self, request, obj=None):
        return request.user.is_superuser or (
            is_seller_user(request.user) and obj is not None and seller_can_access_order(request.user, obj)
        )

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related('product__seller', 'ticket')
        if request.user.is_superuser:
            return queryset
        if is_seller_user(request.user):
            return queryset.filter(product__seller=request.user)
        return queryset.none()
    
    def subtotal(self, obj):
        return f"€{obj.subtotal}"
    subtotal.short_description = 'Subtotal'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user_email', 'shipping_name', 'payment_method', 'shipping_method', 'status', 'discount_display', 'total_amount_display', 'is_pre_order', 'delivered_status', 'created_at')
    list_filter = (OrderSellerListFilter, 'status', 'payment_method', 'shipping_method', 'created_at', 'updated_at')
    search_fields = ('id', 'email', 'user__email', 'shipping_name', 'shipping_city', 'phone', 'packeta_point_name')
    readonly_fields = ('user', 'email', 'status', 'shipping_method', 'total_amount', 'discount_amount', 'discount_code', 'created_at', 'updated_at', 'delivered_at', 'review_request_sent_at', 'is_pre_order',
                      'shipping_name', 'shipping_address', 'shipping_city', 'shipping_postal_code', 'shipping_country', 'phone',
                      'packeta_point_id', 'packeta_point_name', 'packeta_point_address', 'packeta_packet_id', 
                      'tracking_number', 'carrier_tracking_url', 'is_company_purchase', 'billing_company', 
                      'billing_ico', 'billing_dic', 'billing_ic_dph')
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['mark_as_paid', 'mark_as_shipped', 'mark_as_delivered', 'mark_as_cancelled', 'create_packeta_shipment', 'complete_order']
    
    def has_add_permission(self, request):
        # Orders can only be created through the frontend API
        return False

    def has_module_permission(self, request):
        return request.user.is_superuser or is_seller_user(request.user)

    def has_view_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if not is_seller_user(request.user):
            return False
        return obj is None or seller_can_access_order(request.user, obj)
    
    def has_change_permission(self, request, obj=None):
        if request.user.is_superuser:
            return True
        if not is_seller_user(request.user):
            return False
        return obj is None or seller_can_access_order(request.user, obj)
    
    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete orders
        return request.user.is_superuser

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related('user').prefetch_related('items__product__seller', 'items__ticket')
        return filter_orders_for_user(queryset, request.user)

    def get_list_filter(self, request):
        if request.user.is_superuser:
            return self.list_filter
        return tuple(value for value in self.list_filter if value is not OrderSellerListFilter)

    def get_actions(self, request):
        actions = super().get_actions(request)
        if request.user.is_superuser:
            return actions
        if is_seller_user(request.user):
            allowed = {'mark_as_shipped', 'mark_as_delivered'}
            return {name: value for name, value in actions.items() if name in allowed}
        return {}
    
    fieldsets = (
        ('Order Info', {
            'fields': ('user', 'status', 'shipping_method', 'discount_code', 'discount_amount', 'total_amount', 'is_pre_order'),
            'description': 'Order details are read-only. Use actions to change status.'
        }),
        ('Shipping Address', {
            'fields': ('shipping_name', 'shipping_address', 'shipping_city',
                      'shipping_postal_code', 'shipping_country', 'phone')
        }),
        ('Packeta Details', {
            'fields': ('packeta_point_id', 'packeta_point_name', 'packeta_point_address', 
                      'packeta_packet_id', 'tracking_number', 'carrier_tracking_url'),
            'classes': ('collapse',),
            'description': 'Packeta pickup point and shipment tracking information'
        }),
        ('Company Purchase', {
            'fields': ('is_company_purchase', 'billing_company', 'billing_ico', 'billing_dic', 'billing_ic_dph'),
            'classes': ('collapse',),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'delivered_at', 'review_request_sent_at'),
            'classes': ('collapse',)
        }),
    )
    
    def order_number(self, obj):
        return f"#{obj.id}"
    order_number.short_description = 'Order'
    order_number.admin_order_field = 'id'
    
    def user_email(self, obj):
        return obj.email or (obj.user.email if obj.user else '—')
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'email'
    
    def total_amount_display(self, obj):
        return f"€{obj.total_amount}"
    total_amount_display.short_description = 'Total'
    total_amount_display.admin_order_field = 'total_amount'
    
    def discount_display(self, obj):
        if obj.discount_code:
            return f"-€{obj.discount_amount} ({obj.discount_code.code})"
        return "-"
    discount_display.short_description = 'Discount'
    
    def is_pre_order(self, obj):
        return obj.is_pre_order
    is_pre_order.boolean = True
    is_pre_order.short_description = 'Pre-order'
    
    def delivered_status(self, obj):
        """Show delivery and review request status"""
        if obj.status != 'delivered':
            return '-'
        
        if obj.review_request_sent_at:
            return f'✓ Review sent ({obj.review_request_sent_at.strftime("%Y-%m-%d")})'
        elif obj.delivered_at:
            from settings.models import MainSettings
            settings_obj = MainSettings.get_settings()
            days_since = (datetime.now() - obj.delivered_at).days
            days_until_email = settings_obj.review_email_days_after_delivery - days_since
            if days_until_email > 0:
                return f'⏳ Review in {days_until_email} days'
            else:
                return '⚠️ Review pending'
        return '?'
    delivered_status.short_description = 'Review Status'
    
    # Actions
    def mark_as_paid(self, request, queryset):
        from orders.emails import send_payment_confirmation_email
        count = 0
        for order in queryset:
            if order.status != 'paid':
                logger.info("Admin user %s marked order #%s as paid from admin action", request.user.pk, order.id)
                order.status = 'paid'
                order.save()  # Triggers post_save signal → generates ticket codes + sends ticket email
                transaction.on_commit(lambda order=order: send_payment_confirmation_email(order))
                count += 1
        self.message_user(request, f"{count} order(s) marked as paid and emails sent.", level=messages.SUCCESS)
    mark_as_paid.short_description = "Mark selected orders as Paid"
    
    def mark_as_shipped(self, request, queryset):
        allowed_queryset = queryset
        blocked_count = 0
        if is_seller_user(request.user) and not request.user.is_superuser:
            allowed_ids = []
            for order in queryset:
                if seller_can_manage_order(request.user, order):
                    allowed_ids.append(order.id)
                else:
                    blocked_count += 1
            allowed_queryset = queryset.filter(id__in=allowed_ids)

        updated = allowed_queryset.update(status='shipped')
        if updated:
            self.message_user(request, f"{updated} order(s) marked as Shipped.", level=messages.SUCCESS)
        if blocked_count:
            self.message_user(
                request,
                f"{blocked_count} order(s) skipped because seller can update only orders containing exclusively their own products.",
                level=messages.WARNING
            )
    mark_as_shipped.short_description = "Mark selected orders as Shipped"
    
    def mark_as_delivered(self, request, queryset):
        allowed_queryset = queryset
        blocked_count = 0
        if is_seller_user(request.user) and not request.user.is_superuser:
            allowed_ids = []
            for order in queryset:
                if seller_can_manage_order(request.user, order):
                    allowed_ids.append(order.id)
                else:
                    blocked_count += 1
            allowed_queryset = queryset.filter(id__in=allowed_ids)

        updated = allowed_queryset.update(status='delivered')
        if updated:
            self.message_user(request, f"{updated} order(s) marked as Delivered.", level=messages.SUCCESS)
        if blocked_count:
            self.message_user(
                request,
                f"{blocked_count} order(s) skipped because seller can update only orders containing exclusively their own products.",
                level=messages.WARNING
            )
    mark_as_delivered.short_description = "Mark selected orders as Delivered"
    
    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='cancelled')
    mark_as_cancelled.short_description = "Mark selected orders as Cancelled"
    
    def complete_order(self, request, queryset):
        """Mark order as completed/delivered"""
        updated = queryset.update(status='delivered')
        self.message_user(
            request,
            f"{updated} order(s) marked as completed/delivered.",
            level=messages.SUCCESS
        )
    complete_order.short_description = "✓ Complete Order (mark as Delivered)"
    
    def create_packeta_shipment(self, request, queryset):
        """Create Packeta shipment for selected orders"""
        packeta_service = PacketaService.from_settings()
        
        if not packeta_service:
            self.message_user(
                request,
                "Packeta API password not configured. Please set PACKETA_API_PASSWORD in .env file.",
                level=messages.ERROR
            )
            return
        
        # Notify if in test mode
        if packeta_service.test_mode:
            self.message_user(
                request,
                "⚠️ TEST MODE - No real shipments will be created. Set PACKETA_REAL_WORLD_USAGE=True in .env for production.",
                level=messages.WARNING
            )
        
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for order in queryset:
            # Skip if already has tracking
            if order.packeta_packet_id:
                skipped_count += 1
                continue
            
            # Only for Packeta shipping methods
            if order.shipping_method not in ['packeta_box', 'packeta_courier']:
                skipped_count += 1
                continue
            
            try:
                result = packeta_service.create_packet(order)
                
                # Update order with tracking info
                order.packeta_packet_id = result['packet_id']
                order.tracking_number = result['barcode']
                order.carrier_tracking_url = result['tracking_url']
                order.save()
                
                created_count += 1
                
            except PacketaAPIError as e:
                self.message_user(
                    request,
                    f"Failed to create shipment for Order #{order.id}: {str(e)}",
                    level=messages.ERROR
                )
                error_count += 1
        
        if created_count > 0:
            self.message_user(
                request,
                f"Successfully created {created_count} Packeta shipment(s).",
                level=messages.SUCCESS
            )
        
        if skipped_count > 0:
            self.message_user(
                request,
                f"Skipped {skipped_count} order(s) (already shipped or not Packeta method).",
                level=messages.WARNING
            )
    
    create_packeta_shipment.short_description = "Create Packeta shipment for selected orders"

@admin.register(PurchasedTicket)
class PurchasedTicketAdmin(SellerHiddenAdminMixin, admin.ModelAdmin):
    list_display = ('code', 'ticket_name', 'order_link', 'user_email', 'toggle_used_button', 'used_at', 'created_at')
    list_filter = ('is_used', 'ticket', 'created_at')
    search_fields = ('code', 'order__id', 'order__user__email', 'ticket__name')
    readonly_fields = ('code', 'order', 'order_item', 'ticket', 'created_at')
    date_hierarchy = 'created_at'
    list_per_page = 50
    actions = ['mark_as_used', 'mark_as_unused']

    fieldsets = (
        ('Vstupenka', {
            'fields': ('code', 'ticket', 'order', 'order_item')
        }),
        ('Stav', {
            'fields': ('is_used', 'used_at', 'used_by_note')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path(
                '<int:pk>/toggle-used/',
                self.admin_site.admin_view(self.toggle_used_view),
                name='orders_purchasedticket_toggle_used',
            ),
        ]
        return custom + urls

    def toggle_used_view(self, request, pk):
        from django.urls import reverse
        ticket = PurchasedTicket.objects.get(pk=pk)
        if ticket.is_used:
            ticket.is_used = False
            ticket.used_at = None
        else:
            ticket.is_used = True
            ticket.used_at = datetime.now()
        ticket.save(update_fields=['is_used', 'used_at'])
        return HttpResponseRedirect(request.META.get('HTTP_REFERER', reverse('admin:orders_purchasedticket_changelist')))

    def ticket_name(self, obj):
        return obj.ticket.name
    ticket_name.short_description = 'Vstupenka'
    ticket_name.admin_order_field = 'ticket__name'

    def order_link(self, obj):
        from django.urls import reverse
        url = reverse('admin:orders_order_change', args=[obj.order.id])
        return format_html('<a href="{}">#{}</a>', url, obj.order.id)
    order_link.short_description = 'Objednávka'

    def toggle_used_button(self, obj):
        from django.urls import reverse
        url = reverse('admin:orders_purchasedticket_toggle_used', args=[obj.pk])
        if obj.is_used:
            return format_html(
                '<a href="{}" style="display:inline-block;padding:4px 12px;background:#dc2626;color:#fff;'
                'font-size:12px;font-weight:600;text-decoration:none;border-radius:3px;white-space:nowrap;">'
                '&#10003; Použitá &mdash; zrušiť</a>',
                url
            )
        return format_html(
            '<a href="{}" style="display:inline-block;padding:4px 12px;background:#16a34a;color:#fff;'
            'font-size:12px;font-weight:600;text-decoration:none;border-radius:3px;white-space:nowrap;">'
            'Označ ako použitú</a>',
            url
        )
    toggle_used_button.short_description = 'Stav'
    toggle_used_button.allow_tags = True

    def user_email(self, obj):
        return obj.order.email or (obj.order.user.email if obj.order.user else '—')
    user_email.short_description = 'Email'

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def mark_as_used(self, request, queryset):
        queryset.update(is_used=True, used_at=datetime.now())
        self.message_user(request, f'Označené ako použité: {queryset.count()}')
    mark_as_used.short_description = 'Označiť ako použité'

    def mark_as_unused(self, request, queryset):
        queryset.update(is_used=False, used_at=None)
        self.message_user(request, f'Označené ako nepoužité: {queryset.count()}')
    mark_as_unused.short_description = 'Označiť ako nepoužité'
