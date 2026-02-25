from django.contrib import admin
from django.utils.html import format_html
from datetime import datetime, timedelta
from decimal import Decimal
from .models import DiscountCode, QRCode


@admin.register(DiscountCode)
class DiscountCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'user_email', 'discount_percentage', 'free_shipping_badge', 'minimum_order_value', 'code_type', 'usage_info', 'status_badge', 'valid_until')
    list_filter = ('code_type', 'is_active', 'is_used', 'is_free_shipping', 'created_at', 'user')
    search_fields = ('code', 'user__email', 'user__first_name', 'user__last_name')
    readonly_fields = ('created_at', 'used_at', 'usage_count')
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['activate_codes', 'deactivate_codes', 'mark_as_unused', 'extend_validity', 'generate_loyalty_codes', 'generate_promo_codes']
    
    class Media:
        js = ('admin/js/generate_code.js',)
    
    fieldsets = (
        ('Code Info', {
            'fields': ('code', 'user', 'discount_percentage', 'code_type')
        }),
        ('Benefits', {
            'fields': ('is_free_shipping', 'minimum_order_value')
        }),
        ('Usage Limits', {
            'fields': ('max_uses', 'usage_count')
        }),
        ('Status', {
            'fields': ('is_active', 'is_used')
        }),
        ('Validity', {
            'fields': ('valid_from', 'valid_until')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'used_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email if obj.user else 'N/A'
    user_email.short_description = 'User'
    user_email.admin_order_field = 'user__email'
    
    def usage_info(self, obj):
        if obj.max_uses is None:
            return f"{obj.usage_count}/∞"
        return f"{obj.usage_count}/{obj.max_uses}"
    usage_info.short_description = 'Usage'
    
    def free_shipping_badge(self, obj):
        if obj.is_free_shipping:
            return format_html('<span style="color: blue; font-weight: bold;">🚚 Free</span>')
        return ''
    free_shipping_badge.short_description = 'Shipping'
    
    def status_badge(self, obj):
        if obj.is_used or (obj.max_uses is not None and obj.usage_count >= obj.max_uses):
            return format_html('<span style="color: gray;">● Used</span>')
        elif not obj.is_active:
            return format_html('<span style="color: red;">● Inactive</span>')
        elif obj.valid_until is not None and obj.valid_until < datetime.now():
            return format_html('<span style="color: orange;">● Expired</span>')
        else:
            return format_html('<span style="color: green; font-weight: bold;">● Active</span>')
    status_badge.short_description = 'Status'
    
    # Actions
    def activate_codes(self, request, queryset):
        queryset.update(is_active=True)
    activate_codes.short_description = "Aktivovať vybrané kódy"
    
    def deactivate_codes(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_codes.short_description = "Deaktivovať vybrané kódy"
    
    def mark_as_unused(self, request, queryset):
        queryset.update(is_used=False, used_at=None)
    mark_as_unused.short_description = "Označiť vybrané kódy ako nepoužité"
    
    def extend_validity(self, request, queryset):
        count = 0
        for code in queryset:
            if code.valid_until is not None:
                code.valid_until = datetime.now() + timedelta(days=30)
                code.save()
                count += 1
        self.message_user(request, f"Extended validity for {count} codes by 30 days (skipped {queryset.count() - count} codes with no expiration)")
    extend_validity.short_description = "Extend validity by 30 days"
    
    def generate_loyalty_codes(self, request, queryset):
        """Generate loyalty codes for selected users"""
        from accounts.models import User
        count = 0
        for user_id in queryset.values_list('user_id', flat=True).distinct():
            if user_id:
                user = User.objects.get(id=user_id)
                from .models import LoyaltyService
                code = LoyaltyService.check_and_generate_loyalty_code(user)
                if code:
                    count += 1
        self.message_user(request, f"Generated {count} loyalty codes")
    generate_loyalty_codes.short_description = "Generate loyalty codes"
    
    def generate_promo_codes(self, request, queryset):
        """Bulk generate promotional codes"""
        from django.shortcuts import render, redirect
        from django import forms
        
        class PromoCodeForm(forms.Form):
            count = forms.IntegerField(label='Number of codes', min_value=1, max_value=100, initial=10)
            discount_percentage = forms.DecimalField(label='Discount %', min_value=Decimal('1'), max_value=Decimal('100'), initial=Decimal('10'))
            minimum_order_value = forms.DecimalField(label='Minimum order value (€)', min_value=Decimal('0'), initial=Decimal('0'))
            max_uses = forms.IntegerField(label='Max uses per code (0 = unlimited)', min_value=0, initial=1, required=False)
            valid_days = forms.IntegerField(label='Valid for (days) (0 = no expiration)', min_value=0, initial=30, required=False)
            prefix = forms.CharField(label='Code prefix', max_length=10, initial='PROMO')
        
        if 'apply' in request.POST:
            form = PromoCodeForm(request.POST)
            if form.is_valid():
                count = form.cleaned_data['count']
                max_uses = form.cleaned_data.get('max_uses')
                valid_days = form.cleaned_data.get('valid_days')
                
                # Convert 0 to None for unlimited
                if max_uses == 0:
                    max_uses = None
                
                # Calculate expiration date
                valid_until = None
                if valid_days and valid_days > 0:
                    valid_until = datetime.now() + timedelta(days=valid_days)
                
                for _ in range(count):
                    code = DiscountCode.generate_code(
                        prefix=form.cleaned_data['prefix'],
                        length=8
                    )
                    DiscountCode.objects.create(
                        code=code,
                        discount_percentage=form.cleaned_data['discount_percentage'],
                        minimum_order_value=form.cleaned_data['minimum_order_value'],
                        max_uses=max_uses,
                        code_type='promotion',
                        is_active=True,
                        valid_from=datetime.now(),
                        valid_until=valid_until
                    )
                self.message_user(request, f"Successfully generated {count} promotional codes")
                return redirect(request.get_full_path())
        else:
            form = PromoCodeForm()
        
        return render(request, 'admin/generate_promo_codes.html', {'form': form})
    generate_promo_codes.short_description = "Generate promotional codes"


@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    list_display = ('title', 'code', 'qr_type', 'scan_count', 'status_badge', 'last_scanned_at', 'created_at')
    list_filter = ('qr_type', 'is_active', 'created_at')
    search_fields = ('title', 'code', 'target_url', 'description')
    readonly_fields = ('code', 'scan_count', 'last_scanned_at', 'created_at', 'updated_at', 'qr_code_preview')
    date_hierarchy = 'created_at'
    list_per_page = 25
    actions = ['activate_qr_codes', 'deactivate_qr_codes', 'reset_scan_count']
    
    fieldsets = (
        ('QR Code Info', {
            'fields': ('title', 'code', 'qr_type', 'target_url', 'description')
        }),
        ('Associated Discount', {
            'fields': ('discount_code',),
            'classes': ('collapse',)
        }),
        ('Statistics', {
            'fields': ('scan_count', 'last_scanned_at')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Preview', {
            'fields': ('qr_code_preview',),
            'description': 'QR Code Preview (generated dynamically)'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_badge(self, obj):
        if not obj.is_active:
            return format_html('<span style="color: red;">● Inactive</span>')
        return format_html('<span style="color: green; font-weight: bold;">● Active</span>')
    status_badge.short_description = 'Status'
    
    def qr_code_preview(self, obj):
        if obj.pk:
            qr_data = obj.get_qr_image_data()
            if qr_data:
                return format_html(
                    '<div style="text-align: center;">'
                    '<img src="{}" style="max-width: 300px; border: 1px solid #ddd; padding: 10px;"/>'
                    '<br><small>Scan URL: <a href="{}" target="_blank">{}</a></small>'
                    '</div>',
                    qr_data, obj.target_url, obj.target_url
                )
            return "QR code generation requires 'qrcode' library. Install with: pip install qrcode[pil]"
        return "Save the QR code first to generate preview"
    qr_code_preview.short_description = 'QR Code Preview'
    
    def save_model(self, request, obj, form, change):
        if not obj.code:
            obj.code = QRCode.generate_code()
        super().save_model(request, obj, form, change)
    
    # Actions
    def activate_qr_codes(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f"Aktivované {count} QR kódov")
    activate_qr_codes.short_description = "Aktivovať vybrané QR kódy"
    
    def deactivate_qr_codes(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"Deaktivované {count} QR kódov")
    deactivate_qr_codes.short_description = "Deaktivovať vybrané QR kódy"
    
    def reset_scan_count(self, request, queryset):
        count = queryset.update(scan_count=0, last_scanned_at=None)
        self.message_user(request, f"Resetovaný počet skenovaní pre {count} QR kódov")
    reset_scan_count.short_description = "Resetovať počet skenovaní"