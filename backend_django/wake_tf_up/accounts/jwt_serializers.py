from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework import serializers


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT serializer that uses email instead of username"""
    username_field = 'email'
    
    def validate(self, attrs):
        # Change the field name from username to email
        credentials = {
            'email': attrs.get('email'),
            'password': attrs.get('password')
        }
        
        # Call parent validation with correct field
        return super().validate(attrs)
