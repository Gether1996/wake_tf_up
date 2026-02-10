from django.contrib import admin
from django.utils.html import format_html
from core.email_utils import get_email_language, send_localized_email
from .models import Review, ReviewToken


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'product', 'display_name_col', 'rating_stars', 'text_preview', 'is_anonymous', 'created_at')
    list_display_links = ('id', 'product')
    list_filter = ('rating', 'is_anonymous', 'created_at', 'product')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'product__name', 'text', 'reviewer_name')
    readonly_fields = ('created_at', 'updated_at', 'display_name_col')
    date_hierarchy = 'created_at'
    list_per_page = 25
    ordering = ('-created_at',)
    list_editable = ('is_anonymous',)
    actions = ['mark_as_anonymous', 'mark_as_not_anonymous', 'delete_selected']
    
    fieldsets = (
        ('Review Info', {
            'fields': ('user', 'product', 'rating', 'text')
        }),
        ('Display Info', {
            'fields': ('reviewer_name', 'is_anonymous', 'display_name_col')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def display_name_col(self, obj):
        return obj.get_display_name()
    display_name_col.short_description = 'Display Name'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def rating_stars(self, obj):
        stars = '⭐' * obj.rating
        return format_html('<span style="font-size: 16px;">{}</span>', stars)
    rating_stars.short_description = 'Rating'
    rating_stars.admin_order_field = 'rating'
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Review'
    
    # Custom actions
    @admin.action(description='Mark as anonymous')
    def mark_as_anonymous(self, request, queryset):
        updated = queryset.update(is_anonymous=True)
        self.message_user(request, f'{updated} reviews marked as anonymous.')
    
    @admin.action(description='Mark as not anonymous')
    def mark_as_not_anonymous(self, request, queryset):
        updated = queryset.update(is_anonymous=False)
        self.message_user(request, f'{updated} reviews marked as not anonymous.')
    
    def delete_queryset(self, request, queryset):
        """Custom delete to handle bulk deletions"""
        count = queryset.count()
        queryset.delete()
        self.message_user(request, f'{count} reviews deleted successfully.')
    
    def has_delete_permission(self, request, obj=None):
        """Allow deletion"""
        return True


@admin.register(ReviewToken)
class ReviewTokenAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_id', 'user_email', 'product_name', 'status_badge', 'expires_at', 'created_at')
    list_display_links = ('id', 'order_id')
    list_filter = ('is_used', 'expires_at', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'product__name', 'order__id', 'token')
    readonly_fields = ('token', 'created_at', 'used_at', 'token_link')
    date_hierarchy = 'created_at'
    list_per_page = 25
    ordering = ('-created_at',)
    actions = ['mark_as_used', 'resend_email', 'delete_selected']
    
    fieldsets = (
        ('Token Info', {
            'fields': ('token', 'token_link', 'order', 'product', 'user')
        }),
        ('Status', {
            'fields': ('is_used', 'expires_at', 'used_at')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def token_link(self, obj):
        """Display clickable review link"""
        from django.conf import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:4200')
        link = f"{base_url}/sk/review/submit?token={obj.token}"
        return format_html(
            '<a href="{}" target="_blank" style="color: #0066cc;">Open Review Form →</a>',
            link
        )
    token_link.short_description = 'Review Link'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def product_name(self, obj):
        return obj.product.name
    product_name.short_description = 'Product'
    product_name.admin_order_field = 'product__name'
    
    def order_id(self, obj):
        return f"Order #{obj.order.id}"
    order_id.short_description = 'Order'
    order_id.admin_order_field = 'order__id'
    
    def status_badge(self, obj):
        if obj.is_used:
            color = 'green'
            text = 'Used'
        elif obj.is_valid():
            color = 'blue'
            text = 'Valid'
        else:
            color = 'red'
            text = 'Expired'
        
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px;">{}</span>',
            color, text
        )
    status_badge.short_description = 'Status'
    
    # Custom actions
    @admin.action(description='Mark tokens as used')
    def mark_as_used(self, request, queryset):
        from datetime import datetime
        updated = queryset.update(is_used=True, used_at=datetime.now())
        self.message_user(request, f'{updated} tokens marked as used.')
    
    @admin.action(description='Resend review request email')
    def resend_email(self, request, queryset):
        """Resend review request emails for selected tokens"""
        from django.conf import settings
        
        # Get language from request
        language_code = get_email_language(request=request)
        
        sent_count = 0
        for token in queryset:
            if not token.is_valid():
                continue
            
            base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:4200')
                
            context = {
                'user': token.user,
                'order': token.order,
                'tokens': [token],
                'base_url': base_url
            }
            
            try:
                send_localized_email(
                    subject_sk=f'Ohodnoťte produkt: {token.product.name}',
                    subject_en=f'Rate product: {token.product.name}',
                    template_path='orders/review_request_email.html',
                    context=context,
                    recipient_list=[token.user.email],
                    language=language_code
                )
                sent_count += 1
            except Exception as e:
                self.message_user(request, f'Error sending email for token {token.id}: {e}', level='error')
        
        if sent_count > 0:
            self.message_user(request, f'{sent_count} review request emails sent successfully.')
    
    def has_delete_permission(self, request, obj=None):
        """Allow deletion"""
        return True
