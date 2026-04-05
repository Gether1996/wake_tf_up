from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.management import call_command
from django.db import transaction as db_transaction
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

    def create_ticket_order(self, *, guest=True, status='created'):
        ticket = Ticket.objects.create(
            name='Wake TF Up Vol. 1',
            price='8.50',
            total_quantity=10,
            is_published=True,
        )
        user = None
        email = 'guest@example.com'
        if not guest:
            user = User.objects.create_user(
                email='registered@example.com',
                password='testpass123',
            )
            email = user.email

        order = Order.objects.create(
            user=user,
            status=status,
            shipping_method='digital_delivery',
            payment_method='gopay',
            shipping_name='Guest Buyer' if guest else 'Registered Buyer',
            email=email,
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
            provider_transaction_id=f'gopay-{order.id}',
        )
        return order, transaction


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
class PaymentFlowRobustnessTests(PaymentTestMixin, TestCase):
    def setUp(self):
        self.client = APIClient()

    def paid_status_payload(self, transaction):
        return {
            'success': True,
            'state': 'PAID',
            'data': {
                'id': transaction.provider_transaction_id,
                'state': 'PAID',
            },
        }

    @patch('payments.gopay_service.GoPayService.check_payment_status')
    def test_reconcile_pending_payments_marks_order_paid_and_generates_ticket(self, mock_check_payment_status):
        order, transaction = self.create_ticket_order()
        mock_check_payment_status.return_value = self.paid_status_payload(transaction)

        with self.captureOnCommitCallbacks(execute=True):
            call_command('reconcile_pending_payments', older_than_minutes=0, limit=10)

        order.refresh_from_db()
        transaction.refresh_from_db()

        self.assertEqual(order.status, 'paid')
        self.assertEqual(transaction.status, 'completed')
        self.assertEqual(PurchasedTicket.objects.filter(order=order).count(), 1)
        self.assertEqual(len(mail.outbox), 2)

    @patch('payments.gopay_service.GoPayService.check_payment_status')
    def test_payment_status_endpoint_finalizes_paid_pending_transaction(self, mock_check_payment_status):
        order, transaction = self.create_ticket_order()
        access_token = get_guest_order_access_token(order)
        mock_check_payment_status.return_value = self.paid_status_payload(transaction)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.get(
                f'/api/v1/payments/status/{order.id}/',
                {'access_token': access_token},
            )

        order.refresh_from_db()
        transaction.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, 'paid')
        self.assertEqual(transaction.status, 'completed')
        self.assertEqual(PurchasedTicket.objects.filter(order=order).count(), 1)
        self.assertEqual(len(mail.outbox), 2)

    @patch('payments.gopay_service.GoPayService.check_payment_status')
    def test_webhook_retries_do_not_duplicate_tickets_or_emails(self, mock_check_payment_status):
        order, transaction = self.create_ticket_order()
        mock_check_payment_status.return_value = self.paid_status_payload(transaction)

        with self.captureOnCommitCallbacks(execute=True):
            first_response = self.client.get(
                '/api/v1/payments/notification/',
                {'id': transaction.provider_transaction_id},
            )

        order.refresh_from_db()
        transaction.refresh_from_db()
        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(order.status, 'paid')
        self.assertEqual(transaction.status, 'completed')
        self.assertEqual(PurchasedTicket.objects.filter(order=order).count(), 1)
        self.assertEqual(len(mail.outbox), 2)

        with self.captureOnCommitCallbacks(execute=True):
            second_response = self.client.get(
                '/api/v1/payments/notification/',
                {'id': transaction.provider_transaction_id},
            )

        order.refresh_from_db()
        transaction.refresh_from_db()
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(order.status, 'paid')
        self.assertEqual(transaction.status, 'completed')
        self.assertEqual(PurchasedTicket.objects.filter(order=order).count(), 1)
        self.assertEqual(len(mail.outbox), 2)

    def test_ticket_email_is_not_sent_when_paid_transaction_rolls_back(self):
        order, _transaction = self.create_ticket_order()

        with self.captureOnCommitCallbacks(execute=True) as callbacks:
            with self.assertRaises(RuntimeError):
                with db_transaction.atomic():
                    order.status = 'paid'
                    order.save(update_fields=['status'])
                    raise RuntimeError('force rollback')

        order.refresh_from_db()
        self.assertEqual(order.status, 'created')
        self.assertEqual(PurchasedTicket.objects.filter(order=order).count(), 0)
        self.assertEqual(len(callbacks), 0)
        self.assertEqual(len(mail.outbox), 0)

    @patch('loyalty.signals.LoyaltyService.check_and_generate_loyalty_code')
    @patch('payments.gopay_service.GoPayService.check_payment_status')
    def test_loyalty_failure_does_not_break_paid_finalization(
        self,
        mock_check_payment_status,
        mock_loyalty_check,
    ):
        order, transaction = self.create_ticket_order(guest=False)
        mock_check_payment_status.return_value = self.paid_status_payload(transaction)
        mock_loyalty_check.side_effect = RuntimeError('loyalty exploded')

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.get(
                '/api/v1/payments/notification/',
                {'id': transaction.provider_transaction_id},
            )

        order.refresh_from_db()
        transaction.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(order.status, 'paid')
        self.assertEqual(transaction.status, 'completed')
        self.assertEqual(PurchasedTicket.objects.filter(order=order).count(), 1)
        self.assertEqual(len(mail.outbox), 2)
