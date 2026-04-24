def is_seller_user(user):
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and getattr(user, 'user_role', None) == 'seller'
    )


def is_seller_or_superuser(user):
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and (getattr(user, 'is_superuser', False) or is_seller_user(user))
    )


def filter_products_for_user(queryset, user):
    if not user or not getattr(user, 'is_authenticated', False):
        return queryset.none()
    if getattr(user, 'is_superuser', False):
        return queryset
    if is_seller_user(user):
        return queryset.filter(seller=user)
    return queryset.none()


def filter_orders_for_user(queryset, user):
    if not user or not getattr(user, 'is_authenticated', False):
        return queryset.none()
    if getattr(user, 'is_superuser', False):
        return queryset
    if is_seller_user(user):
        return queryset.filter(items__product__seller=user).distinct()
    return queryset.none()


def filter_payment_transactions_for_user(queryset, user):
    if not user or not getattr(user, 'is_authenticated', False):
        return queryset.none()
    if getattr(user, 'is_superuser', False):
        return queryset
    if is_seller_user(user):
        return queryset.filter(order__items__product__seller=user).distinct()
    return queryset.none()


def seller_can_access_product(user, product):
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    return is_seller_user(user) and getattr(product, 'seller_id', None) == user.id


def seller_can_access_order(user, order):
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    if not is_seller_user(user):
        return False
    return order.items.filter(product__seller=user).exists()


def seller_can_manage_order(user, order):
    if not is_seller_user(user):
        return False

    product_items = order.items.filter(product__isnull=False)
    if not product_items.exists():
        return False

    has_foreign_product = product_items.exclude(product__seller=user).exists()
    has_non_product_items = order.items.filter(ticket__isnull=False).exists()

    return not has_foreign_product and not has_non_product_items


def seller_can_access_payment_transaction(user, transaction):
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    if not is_seller_user(user):
        return False
    return transaction.order.items.filter(product__seller=user).exists()
