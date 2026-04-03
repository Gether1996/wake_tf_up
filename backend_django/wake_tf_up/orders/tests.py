from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .access import get_guest_order_access_token
from .models import Order


User = get_user_model()


@override_settings(FRONTEND_URL='https://frontend.example')
class OrderAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.authenticated_client = APIClient()
        self.user = User.objects.create_user(
            email='registered@example.com',
            password='testpass123',
        )
        self.authenticated_client.force_authenticate(user=self.user)

    def create_order(self, **overrides):
        payload = {
            'status': 'created',
            'shipping_method': 'pickup',
            'payment_method': 'gopay',
            'shipping_name': 'Test User',
            'email': overrides.pop('email', 'customer@example.com'),
            'shipping_address': 'Main Street 1',
            'shipping_city': 'Bratislava',
            'shipping_postal_code': '81101',
            'shipping_country': 'SK',
            'phone': '+421900000000',
            'shipping_cost': '0.00',
            'total_amount': '10.00',
            'language': 'sk',
        }
        payload.update(overrides)
        return Order.objects.create(**payload)

    def test_guest_can_read_guest_order_with_access_token(self):
        order = self.create_order(user=None, email='guest@example.com')
        access_token = get_guest_order_access_token(order)

        response = self.client.get(
            f'/api/v1/orders/{order.id}/',
            {'access_token': access_token},
        )

        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['id'], order.id)
        self.assertTrue(response_data['guest_access_token'])
        self.assertIn('access_token=', response_data['frontend_order_url'])

    def test_guest_cannot_read_guest_order_without_access_token(self):
        order = self.create_order(user=None, email='guest@example.com')

        response = self.client.get(f'/api/v1/orders/{order.id}/')

        self.assertEqual(response.status_code, 404)

    def test_guest_cannot_read_guest_order_with_invalid_token(self):
        order = self.create_order(user=None, email='guest@example.com')

        response = self.client.get(
            f'/api/v1/orders/{order.id}/',
            {'access_token': 'invalid-token'},
        )

        self.assertEqual(response.status_code, 404)

    def test_authenticated_user_can_read_own_order_without_access_token(self):
        order = self.create_order(user=self.user, email=self.user.email)

        response = self.authenticated_client.get(f'/api/v1/orders/{order.id}/')

        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['id'], order.id)
        self.assertIsNone(response_data['guest_access_token'])
