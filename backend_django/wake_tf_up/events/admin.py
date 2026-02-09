from django.contrib import admin
from django.utils.html import format_html
from .models import Event, EventImage


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'datetime', 'place', 'slug', 'status_badge', 'created_at', 'updated_at')
    list_filter = ('is_published', 'author', 'datetime', 'created_at', 'updated_at')
    search_fields = ('title', 'slug', 'content_html', 'excerpt', 'author', 'place')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'datetime'
    list_per_page = 25
    actions = ['publish_events', 'unpublish_events']
    
    fieldsets = (
        ('Content', {
            'fields': ('title', 'author', 'excerpt', 'content_html')
        }),
        ('Event Details', {
            'fields': ('datetime', 'place')
        }),
        ('Settings', {
            'fields': ('slug', 'is_published')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        if obj.is_published:
            return format_html(
                '<span style="color: green; font-weight: bold;">● Published</span>'
            )
        return format_html(
            '<span style="color: gray;">○ Draft</span>'
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'is_published'
    
    # Actions
    def publish_events(self, request, queryset):
        queryset.update(is_published=True)
    publish_events.short_description = "Publish selected events"
    
    def unpublish_events(self, request, queryset):
        queryset.update(is_published=False)
    unpublish_events.short_description = "Unpublish selected events"


@admin.register(EventImage)
class EventImageAdmin(admin.ModelAdmin):
    list_display = ('title', 'image_preview', 'image_url_display', 'filename_display', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'alt_text', 'caption')
    readonly_fields = ('created_at', 'updated_at', 'image_preview_large', 'full_url_display', 'html_code_display')
    date_hierarchy = 'created_at'
    list_per_page = 25
    
    fieldsets = (
        ('Image Upload', {
            'fields': ('image', 'image_preview_large')
        }),
        ('Image Details', {
            'fields': ('title', 'alt_text', 'caption')
        }),
        ('URLs for Event Content', {
            'fields': ('full_url_display', 'html_code_display'),
            'description': 'Copy these URLs to use in your event HTML content'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def image_preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 100px; max-height: 100px; object-fit: cover;" />',
                obj.image.url
            )
        return '-'
    image_preview.short_description = 'Preview'
    
    def image_preview_large(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-width: 500px; max-height: 500px; object-fit: contain; border: 1px solid #ddd; padding: 10px;" />',
                obj.image.url
            )
        return '-'
    image_preview_large.short_description = 'Image Preview'
    
    def image_url_display(self, obj):
        if obj.image:
            return format_html(
                '<a href="{}" target="_blank" style="color: #0066cc;">View</a>',
                obj.image.url
            )
        return '-'
    image_url_display.short_description = 'URL'
    
    def filename_display(self, obj):
        return obj.filename if obj.image else '-'
    filename_display.short_description = 'Filename'
    
    def full_url_display(self, obj):
        if obj.image:
            url = obj.image.url
            return format_html(
                '<div style="background: #f5f5f5; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px;">'
                '<strong>Image URL:</strong><br>'
                '<input type="text" value="{}" readonly '
                'style="width: 100%; padding: 8px; font-family: monospace; font-size: 12px;" '
                'onclick="this.select(); document.execCommand(\'copy\'); '
                'alert(\'URL copied to clipboard!\');" />'
                '</div>',
                url
            )
        return '-'
    full_url_display.short_description = 'Copy Image URL'
    
    def html_code_display(self, obj):
        if obj.image:
            html_code = f'<img src="{obj.image.url}" alt="{obj.alt_text or obj.title}" />'
            return format_html(
                '<div style="background: #f5f5f5; padding: 10px; border: 1px solid #ddd;">'
                '<strong>HTML Code:</strong><br>'
                '<textarea readonly rows="3" '
                'style="width: 100%; padding: 8px; font-family: monospace; font-size: 12px;" '
                'onclick="this.select(); document.execCommand(\'copy\'); '
                'alert(\'HTML code copied to clipboard!\');">{}</textarea>'
                '</div>',
                html_code
            )
        return '-'
    html_code_display.short_description = 'Copy HTML Code'
