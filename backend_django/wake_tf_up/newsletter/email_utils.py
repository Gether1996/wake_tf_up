import hashlib
import hmac
from urllib.parse import quote_plus

from django.conf import settings


DEFAULT_FRONTEND_URL = 'https://wake-tf-up.eu'


def get_frontend_base_url(base_url=None):
    resolved_base_url = base_url or getattr(settings, 'FRONTEND_URL', DEFAULT_FRONTEND_URL) or DEFAULT_FRONTEND_URL
    return resolved_base_url.rstrip('/')


def generate_unsubscribe_token(email: str) -> str:
    """Generate a stable HMAC token for unsubscribe links."""
    key = settings.SECRET_KEY.encode()
    return hmac.new(key, email.encode(), hashlib.sha256).hexdigest()[:32]


def build_unsubscribe_url(email: str, language_code='sk', base_url=None) -> str:
    base_url = get_frontend_base_url(base_url)
    safe_language_code = (language_code or 'sk').strip('/')
    encoded_email = quote_plus(email)
    token = generate_unsubscribe_token(email)
    return f"{base_url}/{safe_language_code}/newsletter/unsubscribe?email={encoded_email}&token={token}"
