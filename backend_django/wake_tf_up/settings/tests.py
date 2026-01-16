from django.test import TestCase
from .models import MainSettings


class MainSettingsTestCase(TestCase):
    def test_single_instance(self):
        """Test that only one instance can exist"""
        settings1 = MainSettings.get_settings()
        settings2 = MainSettings.get_settings()
        self.assertEqual(settings1.pk, settings2.pk)
        self.assertEqual(MainSettings.objects.count(), 1)
    
    def test_default_values(self):
        """Test default settings values"""
        settings = MainSettings.get_settings()
        self.assertEqual(settings.free_shipping_threshold, 50.00)
        self.assertEqual(settings.standard_shipping_cost, 5.99)
        self.assertEqual(settings.tax_rate, 20.00)
