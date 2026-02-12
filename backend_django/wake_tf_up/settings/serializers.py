from rest_framework import serializers
from .models import MainSettings


class MainSettingsSerializer(serializers.ModelSerializer):
    """Serializer for MainSettings - exposes and allows updates to settings"""
    
    class Meta:
        model = MainSettings
        fields = [
            'id',
            'free_shipping_threshold',
            'standard_shipping_cost',  # Legacy - keep for backwards compatibility
            'pickup_cost',
            'dpd_courier_cost',
            'packeta_box_cost',
            'packeta_courier_cost',
            'tax_rate',
            'site_name',
            'owner_name',
            'company_id',
            'tax_id',
            'contact_email',
            'phone',
            'address',
            'country',
            'instagram_url',
            'facebook_url',
            'twitter_url',
            'max_cart_quantity',
            'maintenance_mode',
            'maintenance_message',
            'newsletter_popup_delay',
            'newsletter_popup_enabled',
            'review_email_days_after_delivery',
        ]
        read_only_fields = ['id']  # Only ID is read-only, allow updates to all settings
