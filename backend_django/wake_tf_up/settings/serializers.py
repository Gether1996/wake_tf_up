from rest_framework import serializers
from .models import MainSettings


class MainSettingsSerializer(serializers.ModelSerializer):
    """Serializer for MainSettings - exposes public settings to frontend"""
    
    class Meta:
        model = MainSettings
        fields = [
            'free_shipping_threshold',
            'standard_shipping_cost',
            'tax_rate',
            'site_name',
            'contact_email',
            'instagram_url',
            'facebook_url',
            'twitter_url',
            'max_cart_quantity',
            'maintenance_mode',
            'maintenance_message',
        ]
        read_only_fields = fields  # All fields are read-only via API
