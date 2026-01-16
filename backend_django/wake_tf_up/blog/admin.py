from django.contrib import admin
from django.utils.html import format_html
from .models import BlogPost


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
            'fields': ('title', 'author', 'excerpt', 'content_html')
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
