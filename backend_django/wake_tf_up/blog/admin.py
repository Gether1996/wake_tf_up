# =============================================================================
# ⚠️  ANGULAR HTML REQUIREMENTS — READ BEFORE EDITING content_html
# =============================================================================
# The content_html field is rendered inside an Angular [innerHTML] binding.
# Rules:
#   - <script> tags ARE executed (DOM replacement workaround is in place)
#   - Images: use src="/media/..." — auto-rewritten to full API URL on frontend
#   - Do NOT use Angular template syntax: {{ }}, *ngIf, [binding], (event)
#   - Inline styles, CDN links (fonts, icons, etc.) are fine
#   - JS countdowns / getElementById() work — just make sure the id is unique
# =============================================================================

from django.contrib import admin
from django.utils.html import format_html
from .models import BlogPost, BlogImage

HTML_ANGULAR_HELP = (
    "<strong>⚠️ Angular HTML rules:</strong><br>"
    "• <code>&lt;script&gt;</code> tags ARE supported — they are executed after render via DOM replacement.<br>"
    "• Images with <code>src=\"/media/...\"</code> are automatically rewritten to the full API URL.<br>"
    "• Do <strong>not</strong> use Angular template syntax (<code>{{ }}</code>, <code>*ngIf</code>, etc.) — it will break.<br>"
    "• Inline styles and external CDN links (fonts, icons) are allowed.<br>"
    "• Countdown timers and any JS that targets an element by <code>id</code> work fine."
)


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'slug', 'status_badge', 'created_at', 'updated_at')
    list_filter = ('is_published', 'author', 'created_at', 'updated_at')
    search_fields = ('title', 'slug', 'content_html', 'excerpt', 'author')
    prepopulated_fields = {'slug': ('title',)}
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['publish_posts', 'unpublish_posts']
    
    fieldsets = (
        ('Content', {
            'fields': ('title', 'author', 'excerpt', 'content_html'),
            'description': HTML_ANGULAR_HELP,
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
    def publish_posts(self, request, queryset):
        queryset.update(is_published=True)
    publish_posts.short_description = "Publish selected posts"
    
    def unpublish_posts(self, request, queryset):
        queryset.update(is_published=False)
    unpublish_posts.short_description = "Unpublish selected posts"


@admin.register(BlogImage)
class BlogImageAdmin(admin.ModelAdmin):
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
        ('URLs for Blog Content', {
            'fields': ('full_url_display', 'html_code_display'),
            'description': 'Copy these URLs to use in your blog HTML content'
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
