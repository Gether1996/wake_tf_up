from django.contrib import admin, messages
from django.utils.html import format_html
from .models import Subscriber, NewsletterPopupStat


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ('email', 'status_badge', 'subscribed_at', 'unsubscribed_at')
    list_filter = ('is_active', 'subscribed_at')
    search_fields = ('email',)
    readonly_fields = ('subscribed_at', 'unsubscribed_at')
    date_hierarchy = 'subscribed_at'
    list_per_page = 50
    actions = ['activate_subscribers', 'deactivate_subscribers', 'send_bulk_email', 'send_discount_codes']
    
    def status_badge(self, obj):
        if obj.is_active:
            return format_html(
                '<span style="color: green; font-weight: bold;">● Active</span>'
            )
        return format_html(
            '<span style="color: red;">● Unsubscribed</span>'
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'is_active'
    
    # Actions
    def activate_subscribers(self, request, queryset):
        queryset.update(is_active=True, unsubscribed_at=None)
    activate_subscribers.short_description = "Activate selected subscribers"
    
    def deactivate_subscribers(self, request, queryset):
        from datetime import datetime
        queryset.update(is_active=False, unsubscribed_at=datetime.now())
    deactivate_subscribers.short_description = "Deactivate selected subscribers"
    
    def send_bulk_email(self, request, queryset):
        """Send bulk email to selected subscribers"""
        from django.shortcuts import render, redirect
        from django import forms
        from django.core.mail import send_mail
        from django.conf import settings
        
        class BulkEmailForm(forms.Form):
            subject = forms.CharField(
                max_length=200,
                widget=forms.TextInput(attrs={'size': '80'}),
                help_text="Email subject line"
            )
            message = forms.CharField(
                widget=forms.Textarea(attrs={'rows': 15, 'cols': 80}),
                help_text="Email message body"
            )
            include_discount = forms.BooleanField(
                required=False,
                initial=False,
                help_text="Automatically generate and include a 5% discount code for each subscriber"
            )
        
        if 'apply' in request.POST:
            form = BulkEmailForm(request.POST)
            if form.is_valid():
                subject = form.cleaned_data['subject']
                message = form.cleaned_data['message']
                include_discount = form.cleaned_data['include_discount']
                
                sent_count = 0
                for subscriber in queryset:
                    email_message = message
                    
                    # Generate discount code if requested
                    if include_discount:
                        from loyalty.models import LoyaltyService
                        discount_code = LoyaltyService.generate_newsletter_code(subscriber.email)
                        email_message += f"\n\n---\nYour exclusive discount code: {discount_code.code}\n"
                        email_message += f"Discount: {discount_code.discount_percentage}%\n"
                        email_message += f"Valid until: {discount_code.valid_until.strftime('%Y-%m-%d')}\n"
                    
                    try:
                        send_mail(
                            subject=subject,
                            message=email_message,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[subscriber.email],
                            fail_silently=False,
                        )
                        sent_count += 1
                    except Exception as e:
                        self.message_user(request, f"Failed to send to {subscriber.email}: {str(e)}", level=messages.ERROR)
                
                self.message_user(request, f"Successfully sent {sent_count} emails")
                return redirect(request.get_full_path())
        else:
            form = BulkEmailForm()
        
        context = {
            'form': form,
            'subscribers': queryset,
            'subscriber_count': queryset.count(),
        }
        return render(request, 'admin/newsletter/send_bulk_email.html', context)
    send_bulk_email.short_description = "Send bulk email to selected subscribers"
    
    def send_discount_codes(self, request, queryset):
        """Send discount codes to selected subscribers"""
        from loyalty.models import LoyaltyService
        from django.core.mail import send_mail
        from django.conf import settings
        
        sent_count = 0
        for subscriber in queryset:
            try:
                # Generate discount code
                discount_code = LoyaltyService.generate_newsletter_code(subscriber.email)
                
                # Send email with code
                subject = "Your Exclusive Discount Code!"
                message = f"""
Dear Subscriber,

We have a special offer for you!

Your discount code: {discount_code.code}
Discount: {discount_code.discount_percentage}%
Minimum order: {discount_code.minimum_order_value}€
Valid until: {discount_code.valid_until.strftime('%Y-%m-%d')}

Use this code at checkout to enjoy your discount!

Best regards,
Wake TF Up Team
                """
                
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[subscriber.email],
                    fail_silently=False,
                )
                sent_count += 1
            except Exception as e:
                self.message_user(request, f"Failed to send to {subscriber.email}: {str(e)}", level=messages.ERROR)
        
        self.message_user(request, f"Successfully sent {sent_count} discount codes")
    send_discount_codes.short_description = "Send discount codes to selected subscribers"


@admin.register(NewsletterPopupStat)
class NewsletterPopupStatAdmin(admin.ModelAdmin):
    list_display = ('user_display', 'email', 'action_badge', 'created_at', 'ip_address')
    list_filter = ('action', 'created_at')
    search_fields = ('email', 'session_id', 'ip_address', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('user', 'session_id', 'email', 'action', 'ip_address', 'user_agent', 'created_at')
    date_hierarchy = 'created_at'
    list_per_page = 100
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def user_display(self, obj):
        if obj.user:
            return obj.user.email
        session_preview = obj.session_id[:8] if obj.session_id else 'N/A'
        return format_html('<span style="color: gray;">Anonymous ({})</span>', session_preview)
    user_display.short_description = 'User'
    
    def action_badge(self, obj):
        if obj.action == 'subscribed':
            return format_html('<span style="color: green; font-weight: bold;">✓ Subscribed</span>')
        return format_html('<span style="color: orange;">✕ Dismissed</span>')
    action_badge.short_description = 'Action'
    action_badge.admin_order_field = 'action'
    
    # Custom admin method to get statistics
    def changelist_view(self, request, extra_context=None):
        from django.db.models import Count, Q
        extra_context = extra_context or {}
        
        stats = NewsletterPopupStat.objects.aggregate(
            total=Count('id'),
            subscribed=Count('id', filter=Q(action='subscribed')),
            dismissed=Count('id', filter=Q(action='dismissed')),
        )
        
        if stats['total'] > 0:
            conversion_rate = (stats['subscribed'] / stats['total']) * 100
        else:
            conversion_rate = 0
        
        extra_context['popup_stats'] = {
            'total': stats['total'],
            'subscribed': stats['subscribed'],
            'dismissed': stats['dismissed'],
            'conversion_rate': f"{conversion_rate:.1f}%"
        }
        
        return super().changelist_view(request, extra_context)
