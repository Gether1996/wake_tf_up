from urllib.parse import urlencode

from django.conf import settings
from django.core import signing


GUEST_ORDER_ACCESS_SALT = 'orders.guest-access'


def get_order_contact_email(order):
    """Return the normalized recipient email used for guest order access."""
    recipient_email = order.email or (order.user.email if order.user else '')
    return recipient_email.strip().lower()


def get_guest_order_access_token(order):
    """Build a signed access token for guest orders."""
    if order.user_id:
        return None

    recipient_email = get_order_contact_email(order)
    if not recipient_email:
        return None

    return signing.dumps(
        {
            'order_id': order.id,
            'email': recipient_email,
        },
        salt=GUEST_ORDER_ACCESS_SALT,
        compress=True,
    )


def has_valid_guest_order_access(order, token):
    """Validate a signed guest access token against the target order."""
    if order.user_id or not token:
        return False

    recipient_email = get_order_contact_email(order)
    if not recipient_email:
        return False

    try:
        payload = signing.loads(token, salt=GUEST_ORDER_ACCESS_SALT)
    except signing.BadSignature:
        return False

    return (
        payload.get('order_id') == order.id
        and str(payload.get('email', '')).strip().lower() == recipient_email
    )


def get_guest_order_query_params(order):
    token = get_guest_order_access_token(order)
    if not token:
        return {}
    return {'access_token': token}


def build_frontend_order_url(order, language_code=None, base_url=None):
    frontend_base_url = (
        base_url
        or getattr(settings, 'FRONTEND_URL', 'http://www.wake-tf-up.eu')
    ).rstrip('/')
    order_language = language_code or getattr(order, 'language', None) or 'sk'
    order_url = f"{frontend_base_url}/{order_language}/orders/{order.id}"
    query_params = get_guest_order_query_params(order)
    if not query_params:
        return order_url
    return f"{order_url}?{urlencode(query_params)}"
