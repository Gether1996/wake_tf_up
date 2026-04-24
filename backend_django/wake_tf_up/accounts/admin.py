from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from .models import User
from core.admin_mixins import SellerHiddenAdminMixin

# Unregister Groups from admin
admin.site.unregister(Group)


@admin.register(User)
class UserAdmin(SellerHiddenAdminMixin, BaseUserAdmin):
    """Custom User admin for email-based authentication"""
    list_display = ('email', 'phone', 'first_name', 'last_name', 'city', 'country', 'is_superuser', 'user_role', 'theme_preference')
    list_filter = ('is_superuser', 'user_role', 'is_active', 'theme_preference', 'country')
    search_fields = ('email', 'phone', 'first_name', 'last_name', 'city', 'street')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Address', {'fields': ('street', 'city', 'postal_code', 'country')}),
        ('Preferences', {'fields': ('theme_preference',)}),
        ('Permissions', {'fields': ('is_active', 'is_superuser', 'user_role')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'phone', 'user_role', 'password1', 'password2'),
        }),
        ('Address (optional)', {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name', 'street', 'city', 'postal_code', 'country'),
        }),
    )    
    def save_model(self, request, obj, form, change):
        """
        Keep Django admin access aligned with the selected role.
        """
        if obj.is_superuser or obj.user_role in {'staff', 'seller'}:
            obj.is_staff = True
        else:
            obj.is_staff = False
        super().save_model(request, obj, form, change)
