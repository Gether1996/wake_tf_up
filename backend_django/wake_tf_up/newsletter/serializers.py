from rest_framework import serializers
from .models import Subscriber, NewsletterPopupStat


class SubscriberSerializer(serializers.ModelSerializer):
    """Serializer for newsletter subscription"""
    class Meta:
        model = Subscriber
        fields = ('email',)


class NewsletterPopupStatSerializer(serializers.ModelSerializer):
    """Serializer for tracking newsletter popup interactions"""
    class Meta:
        model = NewsletterPopupStat
        fields = ('session_id', 'email', 'action', 'ip_address', 'user_agent')
        extra_kwargs = {
            'session_id': {'required': False},
            'email': {'required': False},
            'action': {'required': False},
            'ip_address': {'required': False},
            'user_agent': {'required': False},
        }
