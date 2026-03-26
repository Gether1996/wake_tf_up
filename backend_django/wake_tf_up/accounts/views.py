from datetime import datetime
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from settings.models import MainSettings
from core.email_utils import send_localized_email
import uuid
from .serializers import (
    UserRegistrationSerializer,
    UserProfileSerializer,
    UserUpdateSerializer
)

User = get_user_model()


def send_verification_email(user, language='sk'):
    """Helper function to send verification email"""
    verification_url = f"{settings.FRONTEND_URL}/{language}/auth/verify-email?token={user.email_verification_token}"
    contact_email = MainSettings.get_contact_email()
    
    context = {
        'user_name': user.first_name or user.email.split('@')[0],
        'user_email': user.email,
        'verification_url': verification_url,
        'contact_email': contact_email,
    }
    
    try:
        send_localized_email(
            subject_sk='WAKE TF UP - Overenie emailu',
            subject_en='WAKE TF UP - Email Verification',
            template_path='emails/email_verification.html',
            context=context,
            recipient_list=[user.email],
            language=language,
        )
        
        # Update sent time
        user.email_verification_sent_at = datetime.now()
        user.save()
        
        return True
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        return False


def send_email_confirmed_notification(user, language='sk'):
    """Helper function to send email confirmation notification"""
    settings = MainSettings.get_settings()
    context = {
        'user_name': user.first_name or user.email.split('@')[0],
        'user_email': user.email,
        'contact_email': settings.contact_email,
        'phone': settings.phone,
        'address': settings.address,
        'owner_name': settings.owner_name,
        'company_id': settings.company_id,
        'tax_id': settings.tax_id,
    }
    
    try:
        send_localized_email(
            subject_sk='WAKE TF UP - Email overený',
            subject_en='WAKE TF UP - Email Verified',
            template_path='emails/email_confirmed.html',
            context=context,
            recipient_list=[user.email],
            language=language,
        )
        
        return True
    except Exception as e:
        print(f"Failed to send email confirmation notification: {e}")
        return False


def send_password_reset_email(user, language='sk'):
    """Helper function to send password reset email"""
    try:
        # Generate new token
        user.password_reset_token = uuid.uuid4()
        user.password_reset_sent_at = datetime.now()
        user.save()
        
        # Create reset URL
        reset_url = f"{settings.FRONTEND_URL}/{language}/auth/reset-password?token={user.password_reset_token}"
        
        context = {
            'user_name': user.first_name or user.email.split('@')[0],
            'user_email': user.email,
            'reset_url': reset_url,
        }
        
        send_localized_email(
            subject_sk='WAKE TF UP - Zmena hesla',
            subject_en='WAKE TF UP - Password Reset',
            template_path='emails/password_reset.html',
            context=context,
            recipient_list=[user.email],
            language=language,
        )
        
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.
    POST /api/v1/auth/register/
    Body: { email, password, password2, language: 'sk'|'en' (optional) }
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get language from request data
        language = serializer.validated_data.pop('language', 'sk')
        user = serializer.save()
        
        # Send verification email in user's language
        send_verification_email(user, language=language)
        
        return Response({
            'message': 'Registration successful. Please check your email to verify your account.',
            'email': user.email,
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update user profile.
    GET/PUT /api/v1/auth/profile/
    """
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_object(self):
        return self.request.user
    
    def get_serializer_class(self):
        if self.request.method == 'GET':
            return UserProfileSerializer
        return UserUpdateSerializer


class VerifyEmailView(APIView):
    """
    Verify user email with token.
    GET /api/v1/auth/verify-email/?token=<uuid>
    """
    permission_classes = (permissions.AllowAny,)
    
    def get(self, request):
        token = request.query_params.get('token')
        
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email_verification_token=token)
            
            if user.is_email_verified:
                return Response(
                    {'message': 'Email already verified'},
                    status=status.HTTP_200_OK
                )
            
            user.is_email_verified = True
            user.is_active = True
            user.save()
            
            # Send confirmation email
            send_email_confirmed_notification(user, language='sk')
            
            return Response(
                {'message': 'Email verified successfully'},
                status=status.HTTP_200_OK
            )
        
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ResendVerificationEmailView(APIView):
    """
    Resend verification email.
    POST /api/v1/auth/resend-verification/
    Body: {"email": "user@example.com"}
    """
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        language = request.data.get('language', 'sk')  # Get language from request, default to 'sk'
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            if user.is_email_verified:
                return Response(
                    {'message': 'Email already verified'},
                    status=status.HTTP_200_OK
                )
            
            # Check if email was sent recently (prevent spam)
            if user.email_verification_sent_at:
                from datetime import timedelta
                time_since_last_email = datetime.now() - user.email_verification_sent_at
                if time_since_last_email < timedelta(minutes=2):
                    return Response(
                        {'error': 'Please wait a few minutes before requesting another email'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )
            
            # Rotate the verification token so old links are invalidated
            user.email_verification_token = uuid.uuid4()
            user.save(update_fields=['email_verification_token'])
            
            # Send verification email
            success = send_verification_email(user, language)
            
            if success:
                return Response(
                    {'message': 'Verification email sent successfully'},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {'error': 'Failed to send email'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        except User.DoesNotExist:
            # Don't reveal if user exists or not (security)
            return Response(
                {'message': 'If the email exists, a verification link has been sent'},
                status=status.HTTP_200_OK
            )


class RequestPasswordResetView(APIView):
    """
    Request password reset email.
    POST /api/v1/auth/request-password-reset/
    Body: {"email": "user@example.com"}
    """
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        email = request.data.get('email')
        language = request.data.get('language', 'sk')  # Get language from request, default to 'sk'
        
        if not email:
            return Response(
                {'error': 'Email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            # Check if email was sent recently (prevent spam)
            if user.password_reset_sent_at:
                from datetime import timedelta
                time_since_last_email = datetime.now() - user.password_reset_sent_at
                if time_since_last_email < timedelta(minutes=2):
                    return Response(
                        {'error': 'Please wait a few minutes before requesting another email'},
                        status=status.HTTP_429_TOO_MANY_REQUESTS
                    )
            
            # Send password reset email using helper
            send_password_reset_email(user, language)
            
            return Response(
                {'message': 'Password reset email sent successfully'},
                status=status.HTTP_200_OK
            )
        
        except User.DoesNotExist:
            # Don't reveal if user exists or not (security)
            return Response(
                {'message': 'If the email exists, a password reset link has been sent'},
                status=status.HTTP_200_OK
            )


class ResetPasswordView(APIView):
    """
    Reset password with token.
    POST /api/v1/auth/reset-password/
    Body: {"token": "uuid", "password": "newpassword"}
    """
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        token = request.data.get('token')
        password = request.data.get('password')
        
        if not token or not password:
            return Response(
                {'error': 'Token and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(password_reset_token=token)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if token is not too old (24 hours)
        if user.password_reset_sent_at:
            from datetime import timedelta
            token_age = datetime.now() - user.password_reset_sent_at
            if token_age > timedelta(hours=24):
                return Response(
                    {'error': 'Reset link has expired. Please request a new one.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Validate password against AUTH_PASSWORD_VALIDATORS
        try:
            validate_password(password, user)
        except DjangoValidationError as e:
            return Response(
                {'error': ' '.join(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(password)
        user.password_reset_token = uuid.uuid4()  # Invalidate token
        user.save()
        
        return Response(
            {'message': 'Password reset successfully'},
            status=status.HTTP_200_OK
        )
