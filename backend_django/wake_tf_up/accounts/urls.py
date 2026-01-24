from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import (
    RegisterView, ProfileView, VerifyEmailView, 
    ResendVerificationEmailView, RequestPasswordResetView, ResetPasswordView
)
from .views_demo import DemoLoginView, DemoCheckView
from .jwt_serializers import EmailTokenObtainPairSerializer


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer


app_name = 'accounts'

urlpatterns = [
    # Demo access (temporary - production only)
    path('demo/login/', DemoLoginView.as_view(), name='demo_login'),
    path('demo/check/', DemoCheckView.as_view(), name='demo_check'),
    
    # JWT Token endpoints - LOGIN VIA EMAIL
    path('login/', EmailTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # User management
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend_verification'),
    path('request-password-reset/', RequestPasswordResetView.as_view(), name='request_password_reset'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('profile/', ProfileView.as_view(), name='profile'),
]
