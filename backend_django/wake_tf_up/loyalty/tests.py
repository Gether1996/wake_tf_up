from django.test import TestCase, override_settings

from orders.models import Order
from .models import QRCode


@override_settings(
    ALLOWED_HOSTS=['frontend.example', 'testserver'],
    FRONTEND_URL='https://frontend.example',
)
class QRCodeRedirectTests(TestCase):
    def test_qr_redirect_allows_frontend_host(self):
        qr_code = QRCode.objects.create(
            title='Shop QR',
            code='SHOP123',
            target_url='https://frontend.example/sk/shop',
        )

        response = self.client.get(f'/api/v1/loyalty/qr/{qr_code.code}/')

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response['Location'], qr_code.target_url)

    def test_qr_redirect_blocks_unlisted_host(self):
        qr_code = QRCode.objects.create(
            title='Blocked QR',
            code='BLOCK123',
            target_url='https://evil.example/phish',
        )

        response = self.client.get(f'/api/v1/loyalty/qr/{qr_code.code}/')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()['error'], 'QR code target URL is not allowed')


class LoyaltyGuestOrderSafetyTests(TestCase):
    def create_guest_order(self, status='created'):
        return Order.objects.create(
            status=status,
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

    def test_third_guest_paid_order_does_not_crash_loyalty_signal(self):
        self.create_guest_order(status='paid')
        self.create_guest_order(status='paid')
        order = self.create_guest_order(status='created')

        order.status = 'paid'
        order.save()

        order.refresh_from_db()
        self.assertEqual(order.status, 'paid')
