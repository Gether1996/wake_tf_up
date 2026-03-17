from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Color, Product, ProductImage, ProductVideo, Ticket, TicketImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'en_name', 'slug', 'product_count', 'created_at')
    search_fields = ('name', 'en_name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    fields = ('name', 'en_name', 'slug')
    list_per_page = 50
    
    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Shop'
    
    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Products'


@admin.register(Color)
class ColorAdmin(admin.ModelAdmin):
    list_display = ('name', 'en_name', 'hex_code', 'color_preview', 'product_count', 'created_at')
    search_fields = ('name', 'en_name', 'hex_code')
    fields = ('name', 'en_name', 'hex_code')
    list_filter = ('created_at',)
    list_per_page = 50
    
    def color_preview(self, obj):
        return format_html(
            '<div style="width: 30px; height: 30px; background-color: {}; border: 1px solid #ccc;"></div>',
            obj.hex_code
        )
    color_preview.short_description = 'Preview'
    
    def product_count(self, obj):
        return obj.products.count()
    product_count.short_description = 'Products'


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ('image', 'order')


class ProductVideoInline(admin.TabularInline):
    model = ProductVideo
    extra = 1
    fields = ('video', 'thumbnail', 'order')
    fields = ('video', 'thumbnail', 'order')
    ordering = ['order']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'category', 'color_badge', 'price_display', 
        'stock_status', 'available_stock', 'is_limited_drop', 'is_recycled',
        'is_published', 'pre_order_enabled', 'created_at'
    )
    list_filter = ('is_published', 'pre_order_enabled', 'is_limited_drop', 'is_recycled', 'category', 'color', 'created_at')
    search_fields = ('name', 'slug', 'description')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline, ProductVideoInline]
    readonly_fields = ('available_stock', 'sold_quantity', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['publish_products', 'unpublish_products', 'enable_preorder', 'disable_preorder', 
               'mark_as_limited_drop', 'unmark_as_limited_drop', 'mark_as_recycled', 'unmark_as_recycled']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'en_name', 'description', 'en_description', 'slug', 'category', 'color')
        }),
        ('Pricing & Stock', {
            'fields': ('price', 'discount_price', 'total_stock', 'available_stock', 'sold_quantity')
        }),
        ('Settings', {
            'fields': ('is_limited_drop', 'is_recycled', 'pre_order_enabled', 'is_published')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def color_badge(self, obj):
        if not obj.color:
            return format_html('<span style="color: #999;">—</span>')
        return format_html(
            '<span style="display: inline-block; width: 20px; height: 20px; background-color: {}; border: 1px solid #ccc; vertical-align: middle; margin-right: 5px;"></span>{}',
            obj.color.hex_code,
            obj.color.name
        )
    color_badge.short_description = 'Color'
    color_badge.admin_order_field = 'color'
    
    def price_display(self, obj):
        return f"€{obj.price}"
    price_display.short_description = 'Price'
    price_display.admin_order_field = 'price'
    
    def stock_status(self, obj):
        if obj.available_stock > 10:
            color = 'green'
            status = 'In Stock'
        elif obj.available_stock > 0:
            color = 'orange'
            status = 'Low Stock'
        else:
            color = 'red'
            status = 'Out of Stock'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color, status
        )
    stock_status.short_description = 'Status'
    
    def available_stock(self, obj):
        return obj.available_stock
    available_stock.short_description = 'Available'
    
    def sold_quantity(self, obj):
        return obj.sold_quantity
    sold_quantity.short_description = 'Sold'
    
    # Actions
    def publish_products(self, request, queryset):
        queryset.update(is_published=True)
    publish_products.short_description = "Publish selected products"
    
    def unpublish_products(self, request, queryset):
        queryset.update(is_published=False)
    unpublish_products.short_description = "Unpublish selected products"
    
    def enable_preorder(self, request, queryset):
        queryset.update(pre_order_enabled=True)
    enable_preorder.short_description = "Enable pre-order for selected products"
    
    def disable_preorder(self, request, queryset):
        queryset.update(pre_order_enabled=False)
    disable_preorder.short_description = "Disable pre-order for selected products"
    
    def mark_as_limited_drop(self, request, queryset):
        queryset.update(is_limited_drop=True)
    mark_as_limited_drop.short_description = "Mark as Limited"
    
    def unmark_as_limited_drop(self, request, queryset):
        queryset.update(is_limited_drop=False)
    unmark_as_limited_drop.short_description = "Unmark as Limited"
    
    def mark_as_recycled(self, request, queryset):
        queryset.update(is_recycled=True)
    mark_as_recycled.short_description = "Mark as Recycled"
    
    def unmark_as_recycled(self, request, queryset):
        queryset.update(is_recycled=False)
    unmark_as_recycled.short_description = "Unmark as Recycled"


class TicketImageInline(admin.TabularInline):
    model = TicketImage
    extra = 1
    fields = ('image', 'order')


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'price_display', 'event_date', 'event_location',
        'total_quantity', 'sold_quantity', 'is_published', 'created_at'
    )
    list_filter = ('is_published', 'event_date', 'created_at')
    search_fields = ('name', 'slug', 'description', 'event_location')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [TicketImageInline]
    readonly_fields = ('sold_quantity', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['publish_tickets', 'unpublish_tickets']

    fieldsets = (
        ('Základné informácie', {
            'fields': ('name', 'en_name', 'description', 'en_description', 'slug')
        }),
        ('Cena', {
            'fields': ('price', 'discount_price')
        }),
        ('Event', {
            'fields': ('event_date', 'event_location', 'total_quantity', 'sold_quantity')
        }),
        ('Nastavenia', {
            'fields': ('is_published',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def price_display(self, obj):
        if obj.discount_price:
            return format_html(
                '<span style="text-decoration: line-through; color: #999;">€{}</span> '
                '<strong style="color: #16a34a;">€{}</strong>',
                obj.price, obj.discount_price
            )
        return f"€{obj.price}"
    price_display.short_description = 'Cena'
    price_display.admin_order_field = 'price'

    def publish_tickets(self, request, queryset):
        queryset.update(is_published=True)
    publish_tickets.short_description = "Zverejniť vybrané vstupenky"

    def unpublish_tickets(self, request, queryset):
        queryset.update(is_published=False)
    unpublish_tickets.short_description = "Skryť vybrané vstupenky"
