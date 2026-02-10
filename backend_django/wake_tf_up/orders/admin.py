from django.contrib import admin
from django.contrib import messages
from .models import Order, OrderItem
from .packeta_service import PacketaService, PacketaAPIError


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('price_at_purchase', 'is_pre_order', 'subtotal')
    fields = ('product', 'quantity', 'price_at_purchase', 'is_pre_order', 'subtotal')
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        # Prevent adding items through admin - use API instead
        return False
    
    def subtotal(self, obj):
        return f"€{obj.subtotal}"
    subtotal.short_description = 'Subtotal'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user_email', 'shipping_name', 'shipping_method', 'status', 'discount_display', 'total_amount_display', 'is_pre_order', 'created_at')
    list_filter = ('status', 'shipping_method', 'created_at', 'updated_at')
    search_fields = ('id', 'user__email', 'shipping_name', 'shipping_city', 'phone', 'packeta_point_name')
    readonly_fields = ('user', 'status', 'shipping_method', 'total_amount', 'discount_amount', 'discount_code', 'created_at', 'updated_at', 'is_pre_order',
                      'shipping_name', 'shipping_address', 'shipping_city', 'shipping_postal_code', 'shipping_country', 'phone',
                      'packeta_point_id', 'packeta_point_name', 'packeta_point_address', 'packeta_packet_id', 
                      'tracking_number', 'carrier_tracking_url', 'is_company_purchase', 'billing_company', 
                      'billing_ico', 'billing_dic', 'billing_ic_dph')
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['mark_as_paid', 'mark_as_shipped', 'mark_as_delivered', 'mark_as_cancelled', 'create_packeta_shipment']
    
    def has_add_permission(self, request):
        # Orders can only be created through the frontend API
        return False
    
    def has_change_permission(self, request, obj=None):
        # Orders cannot be edited in admin, only status can be changed via actions
        return False
    
    def has_delete_permission(self, request, obj=None):
        # Only superusers can delete orders
        return request.user.is_superuser
    
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
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def order_number(self, obj):
        return f"#{obj.id}"
    order_number.short_description = 'Order'
    order_number.admin_order_field = 'id'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
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
    
    # Actions
    def mark_as_paid(self, request, queryset):
        queryset.update(status='paid')
    mark_as_paid.short_description = "Mark selected orders as Paid"
    
    def mark_as_shipped(self, request, queryset):
        queryset.update(status='shipped')
    mark_as_shipped.short_description = "Mark selected orders as Shipped"
    
    def mark_as_delivered(self, request, queryset):
        queryset.update(status='delivered')
    mark_as_delivered.short_description = "Mark selected orders as Delivered"
    
    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='cancelled')
    mark_as_cancelled.short_description = "Mark selected orders as Cancelled"
    
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
