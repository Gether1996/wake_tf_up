from django.contrib import admin
from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('price_at_purchase', 'is_pre_order', 'subtotal')
    fields = ('product', 'quantity', 'price_at_purchase', 'is_pre_order', 'subtotal')
    can_delete = False
    
    def subtotal(self, obj):
        return f"€{obj.subtotal}"
    subtotal.short_description = 'Subtotal'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user_email', 'shipping_name', 'status', 'total_amount_display', 'is_pre_order', 'created_at')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('id', 'user__email', 'shipping_name', 'shipping_city', 'phone')
    readonly_fields = ('total_amount', 'created_at', 'updated_at', 'is_pre_order')
    inlines = [OrderItemInline]
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['mark_as_paid', 'mark_as_shipped', 'mark_as_delivered', 'mark_as_cancelled']
    
    fieldsets = (
        ('Order Info', {
            'fields': ('user', 'status', 'total_amount', 'is_pre_order')
        }),
        ('Shipping Address', {
            'fields': ('shipping_name', 'shipping_address', 'shipping_city',
                      'shipping_postal_code', 'shipping_country', 'phone')
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
