"""
JWT authentication that reads the access token from an httpOnly cookie
instead of the Authorization header.

The header-based Bearer flow is inherently immune to CSRF (a malicious page
can't read/set an Authorization header on a cross-origin request it
triggers), but cookies are attached by the browser automatically — so once
auth lives in a cookie, CSRF protection has to be added back explicitly for
unsafe methods. This mirrors the same trick DRF's own SessionAuthentication
uses (see rest_framework.authentication.SessionAuthentication.enforce_csrf).
"""
from django.conf import settings
from rest_framework import exceptions
from rest_framework.csrf import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        raw_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
        if raw_token is None:
            # No auth cookie — fall back to the standard Authorization header
            # flow (e.g. for non-browser API clients), which needs no CSRF
            # check since it can't be forged by a browser-driven request.
            return super().authenticate(request)

        try:
            validated_token = self.get_validated_token(raw_token)
        except exceptions.AuthenticationFailed:
            # Expired/garbage cookie: the access_token cookie's path is "/"
            # so it's sent to every endpoint, including AllowAny ones like
            # login and the CSRF-priming view — a stale cookie must not hard
            # -fail those. Treat it as anonymous; protected views still get
            # a 401 from the permission class (no successful_authenticator),
            # which is what triggers the frontend's refresh-then-retry flow.
            return None

        self._enforce_csrf(request)
        return self.get_user(validated_token), validated_token

    def _enforce_csrf(self, request):
        def _dummy_get_response(_request):
            return None

        check = CSRFCheck(_dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')
