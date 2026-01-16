from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that uses email instead of username"""
    username_field = 'email'
    
    def validate(self, attrs):
        # Call parent validation with correct field
        data = super().validate(attrs)
        
        # Check if email is verified
        if not self.user.is_email_verified:
            raise serializers.ValidationError(
                'Please verify your email before logging in. Check your inbox for the verification link.',
                code='email_not_verified'
            )
        
        return data
