"""
Cookie-based JWT views.

The SPA no longer stores tokens in localStorage (an XSS bug elsewhere in the
app could otherwise read/exfiltrate them); instead, login/refresh set
httpOnly cookies and the client only ever sees a plain success/failure
response. See accounts/cookie_auth.py for the matching authentication class
that reads the access-token cookie back out and enforces CSRF for it.
"""
from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from .jwt_serializers import EmailTokenObtainPairSerializer


def _cookie_kwargs(max_age_seconds, path='/'):
    return dict(
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.JWT_COOKIE_SECURE,
        samesite='Lax',
        path=path,
    )


def _set_auth_cookies(response, access, refresh=None):
    access_lifetime = int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds())
    response.set_cookie(settings.JWT_AUTH_COOKIE, access, **_cookie_kwargs(access_lifetime))
    if refresh is not None:
        refresh_lifetime = int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds())
        response.set_cookie(
            settings.JWT_REFRESH_COOKIE,
            refresh,
            # Scoped to the auth endpoints only — the refresh token is the
            # longer-lived credential, no need to send it on every API call.
            **_cookie_kwargs(refresh_lifetime, path='/api/v1/auth/'),
        )


class CookieTokenObtainPairView(TokenObtainPairView):
    """Login: same validation as before, but tokens go into cookies, not the response body."""
    serializer_class = EmailTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access = serializer.validated_data['access']
        refresh = serializer.validated_data['refresh']

        response = Response({'detail': 'Login successful'}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, access, refresh)
        return response


class CookieTokenRefreshView(APIView):
    """Refresh: reads the refresh token from its cookie instead of the request body."""
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE)
        if not refresh_token:
            return Response({'detail': 'Refresh token missing'}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as exc:
            raise InvalidToken(exc.args[0])

        response = Response({'detail': 'Token refreshed'}, status=status.HTTP_200_OK)
        _set_auth_cookies(response, serializer.validated_data['access'])
        return response


class LogoutView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        response = Response({'detail': 'Logged out'}, status=status.HTTP_200_OK)
        response.delete_cookie(settings.JWT_AUTH_COOKIE, path='/')
        response.delete_cookie(settings.JWT_REFRESH_COOKIE, path='/api/v1/auth/')
        return response


class CsrfCookieView(APIView):
    """
    GET this once on app bootstrap so the browser has a csrftoken cookie
    before it needs to send X-CSRFToken on the first unsafe request (login).
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request, *args, **kwargs):
        get_token(request)
        return Response({'detail': 'CSRF cookie set'})
