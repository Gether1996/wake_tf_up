from .seller_access import is_seller_user


class SellerHiddenAdminMixin:
    def has_module_permission(self, request):
        if is_seller_user(request.user):
            return False
        return super().has_module_permission(request)

    def has_view_permission(self, request, obj=None):
        if is_seller_user(request.user):
            return False
        return super().has_view_permission(request, obj)

    def has_add_permission(self, request):
        if is_seller_user(request.user):
            return False
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        if is_seller_user(request.user):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if is_seller_user(request.user):
            return False
        return super().has_delete_permission(request, obj)


class SellerReadOnlyAdminMixin:
    def has_module_permission(self, request):
        if is_seller_user(request.user):
            return True
        return super().has_module_permission(request)

    def has_view_permission(self, request, obj=None):
        if is_seller_user(request.user):
            return True
        return super().has_view_permission(request, obj)

    def has_add_permission(self, request):
        if is_seller_user(request.user):
            return False
        return super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        if is_seller_user(request.user):
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if is_seller_user(request.user):
            return False
        return super().has_delete_permission(request, obj)
