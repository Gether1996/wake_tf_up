from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration - only email and password required"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)
    language = serializers.ChoiceField(
        choices=['sk', 'en'],
        default='sk',
        required=False,
        write_only=True,
        help_text='Preferred language for emails (sk or en)'
    )
    
    class Meta:
        model = User
        fields = (
            'email', 'password', 'password2', 'language',
            'phone', 'first_name', 'last_name',
            'street', 'city', 'postal_code', 'country',
            'theme_preference'
        )
        extra_kwargs = {
            'email': {'required': True},
            'phone': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'street': {'required': False},
            'city': {'required': False},
            'postal_code': {'required': False},
            'country': {'required': False},
            'theme_preference': {'required': False},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                "password": "Password fields didn't match."
            })
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile"""
    class Meta:
        model = User
        fields = (
            'id', 'email', 'phone', 'first_name', 'last_name',
            'street', 'city', 'postal_code', 'country',
            'theme_preference', 'is_staff', 'is_superuser'
        )
        read_only_fields = ('id', 'email', 'is_staff', 'is_superuser')


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    class Meta:
        model = User
        fields = (
            'phone', 'first_name', 'last_name', 
            'street', 'city', 'postal_code', 'country',
            'theme_preference'
        )
