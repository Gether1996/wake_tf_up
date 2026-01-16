from rest_framework import serializers
from .models import Subscriber


class SubscriberSerializer(serializers.ModelSerializer):
    """Serializer for newsletter subscription"""
    class Meta:
        model = Subscriber
        fields = ('email',)
