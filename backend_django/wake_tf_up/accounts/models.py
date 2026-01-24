from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
import uuid


class UserManager(BaseUserManager):
    """Custom user manager for email-based authentication"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True')
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User model with email as primary identifier.
    Login via email and password.
    Required fields: email, password, phone
    """
    username = None  # Remove username field
    
    email = models.EmailField(
        unique=True,
        help_text="Email address - used for login"
    )
    phone = models.CharField(
        max_length=20,
        help_text="Phone number"
    )
    
    # Optional fields
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    
    # Address fields (all optional)
    street = models.CharField(max_length=255, blank=True, help_text="Street and number")
    city = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    
    # Email verification fields
    is_email_verified = models.BooleanField(
        default=False,
        help_text="Whether the user's email has been verified"
    )
    email_verification_token = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        help_text="Token used for email verification"
    )
    email_verification_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the verification email was sent"
    )
    
    # Password reset fields
    password_reset_token = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        help_text="Token used for password reset"
    )
    password_reset_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the password reset email was sent"
    )
    
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
    ]
    
    USER_ROLE_CHOICES = [
        ('regular', 'Regular User'),
        ('staff', 'Staff'),
    ]
    
    theme_preference = models.CharField(
        max_length=10,
        choices=THEME_CHOICES,
        default='auto',
        blank=True,
        help_text="User's preferred UI theme"
    )
    
    user_role = models.CharField(
        max_length=20,
        choices=USER_ROLE_CHOICES,
        default='regular',
        help_text="User role (for non-superusers)"
    )
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # Only email and password are required
    
    objects = UserManager()
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return self.email
