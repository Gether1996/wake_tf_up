from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from .models import User

# Unregister Groups from admin
admin.site.unregister(Group)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin for email-based authentication"""
    list_display = ('email', 'phone', 'first_name', 'last_name', 'city', 'country', 'is_superuser', 'theme_preference')
    list_filter = ('is_superuser', 'is_active', 'theme_preference', 'country')
    search_fields = ('email', 'phone', 'first_name', 'last_name', 'city', 'street')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Address', {'fields': ('street', 'city', 'postal_code', 'country')}),
        ('Preferences', {'fields': ('theme_preference',)}),
        ('Permissions', {'fields': ('is_active', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'phone', 'password1', 'password2'),
        }),
        ('Address (optional)', {
            'classes': ('wide',),
            'fields': ('first_name', 'last_name', 'street', 'city', 'postal_code', 'country'),
        }),
    )
