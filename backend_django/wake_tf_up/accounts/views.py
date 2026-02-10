from datetime import datetime
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from settings.models import MainSettings
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
        # Render HTML template
        html_content = render_to_string(f'emails/email_verification_{language}.html', context)
        
        # Plain text fallback
        text_content = f'''
Ahoj {context['user_name']},

Ďakujeme za registráciu v WAKE TF UP.

Pre overenie vášho emailu prosím kliknite na nasledujúci odkaz:
{verification_url}

Ak ste sa neregistrovali, ignorujte tento email.

WAKE TF UP tím
        ''' if language == 'sk' else f'''
Hello {context['user_name']},

Thank you for signing up with WAKE TF UP.

To verify your email, please click the following link:
{verification_url}

If you didn't sign up, please ignore this email.

WAKE TF UP team
        '''
        
        # Create email with HTML
        email = EmailMultiAlternatives(
            subject='WAKE TF UP - Overenie emailu' if language == 'sk' else 'WAKE TF UP - Email Verification',
            body=text_content.strip(),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        
        # Update sent time
        user.email_verification_sent_at = datetime.now()
        user.save()
        
        return True
    except Exception as e:
        print(f"Failed to send verification email: {e}")
        return False


def send_email_confirmed_notification(user, language='sk'):
    """Helper function to send email confirmation notification"""
    contact_email = MainSettings.get_contact_email()
    context = {
        'user_name': user.first_name or user.email.split('@')[0],
        'user_email': user.email,
        'contact_email': contact_email,
    }
    
    try:
        # Render HTML template
        html_content = render_to_string(f'emails/email_confirmed_{language}.html', context)
        
        # Plain text fallback
        text_content = f'''
Ahoj {context['user_name']},

Váš email bol úspešne overený!

Môžete sa teraz prihlásiť do svojho účtu a začať nakupovať.

Ďakujeme, že ste súčasťou WAKE TF UP!

Ak máte akékoľvek otázky, sme vám k dispozícii na {contact_email}.

WAKE TF UP tím
        ''' if language == 'sk' else f'''
Hello {context['user_name']},

Your email has been successfully verified!

You can now log in to your account and start shopping.

Thank you for being part of WAKE TF UP!

If you have any questions, reach us at {contact_email}.

WAKE TF UP team
        '''
        
        # Create email with HTML
        email = EmailMultiAlternatives(
            subject='WAKE TF UP - Email overený' if language == 'sk' else 'WAKE TF UP - Email Verified',
            body=text_content.strip(),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        
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
        
        # Load HTML template
        template_name = f'emails/password_reset_{language}.html'
        html_content = render_to_string(template_name, context)
        
        # Plain text fallback
        text_content = f'''
Ahoj {context['user_name']},

Dostali sme žiadosť o zmenu hesla pre váš WAKE TF UP účet.

Pre nastavenie nového hesla kliknite na nasledujúci odkaz:
{reset_url}

Tento link je platný 24 hodín.

Ak ste o zmenu hesla nepožiadali, ignorujte tento email.

WAKE TF UP tím
        ''' if language == 'sk' else f'''
Hey {context['user_name']},

We received a request to reset the password for your WAKE TF UP account.

To set a new password, click the following link:
{reset_url}

This link is valid for 24 hours.

If you didn't request a password reset, please ignore this email.

WAKE TF UP team
        '''
        
        # Create email with HTML
        email = EmailMultiAlternatives(
            subject='WAKE TF UP - Zmena hesla' if language == 'sk' else 'WAKE TF UP - Password Reset',
            body=text_content.strip(),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        
        return True
    except Exception as e:
        print(f"Failed to send password reset email: {e}")
        return False


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.
    POST /api/v1/auth/register/
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = UserRegistrationSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Send verification email
        send_verification_email(user, language='sk')
        
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
            
            # Check if token is not too old (24 hours)
            if user.password_reset_sent_at:
                from datetime import timedelta
                token_age = datetime.now() - user.password_reset_sent_at
                if token_age > timedelta(hours=24):
                    return Response(
                        {'error': 'Reset link has expired. Please request a new one.'},
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
        
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )
