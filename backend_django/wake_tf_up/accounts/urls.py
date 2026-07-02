from django.urls import path
from .views import (
    RegisterView, ProfileView, VerifyEmailView,
    ResendVerificationEmailView, RequestPasswordResetView, ResetPasswordView
)
from .cookie_views import (
    CookieTokenObtainPairView, CookieTokenRefreshView, LogoutView, CsrfCookieView,
)


app_name = 'accounts'

urlpatterns = [
    # JWT Token endpoints - LOGIN VIA EMAIL. Tokens are set as httpOnly
    # cookies (see cookie_views.py) rather than returned in the response body.
    path('login/', CookieTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('csrf/', CsrfCookieView.as_view(), name='csrf'),

    # User management
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend_verification'),
    path('request-password-reset/', RequestPasswordResetView.as_view(), name='request_password_reset'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('profile/', ProfileView.as_view(), name='profile'),
]
