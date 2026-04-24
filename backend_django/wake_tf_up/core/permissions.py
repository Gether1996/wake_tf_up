from rest_framework import permissions
from .seller_access import is_seller_or_superuser


class IsSuperuser(permissions.BasePermission):
    """Custom permission to only allow superusers."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsSuperuserOrSeller(permissions.BasePermission):
    """Allow access to superusers and seller accounts."""

    def has_permission(self, request, view):
        return is_seller_or_superuser(request.user)
