from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from orders.access import get_guest_order_access_token
from orders.models import Order, OrderItem, PurchasedTicket
from payments.models import PaymentTransaction
from shop.models import Ticket


User = get_user_model()


class PaymentTestMixin:
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


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@example.com',
    FRONTEND_URL='https://frontend.example',
    GOPAY_DISABLE_PAYMENTS=True,
)
class PaymentAccessTests(PaymentTestMixin, TestCase):
    def setUp(self):
        self.api_client = APIClient()
        self.user = User.objects.create_user(
            email='registered@example.com',
            password='testpass123',
        )

    def test_guest_can_read_payment_status_for_guest_order(self):
        order = self.create_order(user=None, email='guest@example.com')
        access_token = get_guest_order_access_token(order)
        transaction = PaymentTransaction.objects.create(
            order=order,
            amount='10.00',
            status='completed',
            provider='gopay',
            provider_transaction_id='guest-1',
        )

        response = self.client.get(
            f'/api/v1/payments/status/{order.id}/',
            {'access_token': access_token},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['transaction']['id'], transaction.id)
        self.assertEqual(response.json()['order_status'], 'created')

    def test_guest_payment_status_requires_access_token(self):
        order = self.create_order(user=None, email='guest@example.com')
        PaymentTransaction.objects.create(
            order=order,
            amount='10.00',
            status='completed',
            provider='gopay',
            provider_transaction_id='guest-2',
        )

        response = self.client.get(f'/api/v1/payments/status/{order.id}/')

        self.assertEqual(response.status_code, 404)

    def test_guest_can_create_payment_for_guest_order_with_access_token(self):
        order = self.create_order(user=None, email='guest@example.com')
        access_token = get_guest_order_access_token(order)

        response = self.client.post(
            '/api/v1/payments/create/',
            data={'order_id': order.id, 'access_token': access_token},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        self.assertIn('access_token=', response.json()['payment_url'])

    def test_guest_cannot_read_payment_status_for_registered_user_order(self):
        order = self.create_order(user=self.user, email=self.user.email)
        PaymentTransaction.objects.create(
            order=order,
            amount='10.00',
            status='completed',
            provider='gopay',
            provider_transaction_id='user-1',
        )

        response = self.client.get(f'/api/v1/payments/status/{order.id}/')

        self.assertEqual(response.status_code, 404)

    def test_guest_cannot_create_payment_for_registered_user_order(self):
        order = self.create_order(user=self.user, email=self.user.email)

        response = self.client.post(
            '/api/v1/payments/create/',
            data={'order_id': order.id},
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 404)

    def test_authenticated_user_can_read_own_payment_status(self):
        order = self.create_order(user=self.user, email=self.user.email)
        transaction = PaymentTransaction.objects.create(
            order=order,
            amount='10.00',
            status='completed',
            provider='gopay',
            provider_transaction_id='user-own-1',
        )
        self.api_client.force_authenticate(user=self.user)
        response = self.api_client.get(f'/api/v1/payments/status/{order.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['transaction']['id'], transaction.id)


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@example.com',
    FRONTEND_URL='https://frontend.example',
    GOPAY_DISABLE_PAYMENTS=False,
)
class PaymentReconciliationTests(TestCase):
    def create_ticket_order(self):
        ticket = Ticket.objects.create(
            name='Wake TF Up Vol. 1',
            price='8.50',
            total_quantity=10,
            is_published=True,
        )
        order = Order.objects.create(
            status='created',
            shipping_method='digital_delivery',
            payment_method='gopay',
            shipping_name='Guest Buyer',
            email='guest@example.com',
            shipping_address='Digital delivery',
            shipping_city='Bratislava',
            shipping_postal_code='81101',
            shipping_country='SK',
            phone='+421900000000',
            shipping_cost='0.00',
            total_amount='8.50',
            language='sk',
        )
        OrderItem.objects.create(
            order=order,
            ticket=ticket,
            quantity=1,
            price_at_purchase='8.50',
        )
        transaction = PaymentTransaction.objects.create(
            order=order,
            amount='8.50',
            status='pending',
            provider='gopay',
            provider_transaction_id='gopay-paid-1',
        )
        return order, transaction

    @patch('payments.gopay_service.GoPayService.check_payment_status')
    def test_reconcile_pending_payments_marks_order_paid_and_generates_ticket(self, mock_check_payment_status):
        order, transaction = self.create_ticket_order()
        mock_check_payment_status.return_value = {
            'success': True,
            'state': 'PAID',
            'data': {
                'id': transaction.provider_transaction_id,
                'state': 'PAID',
            },
        }

        call_command('reconcile_pending_payments', older_than_minutes=0, limit=10)

        order.refresh_from_db()
        transaction.refresh_from_db()

        self.assertEqual(order.status, 'paid')
        self.assertEqual(transaction.status, 'completed')
        self.assertEqual(PurchasedTicket.objects.filter(order=order).count(), 1)
