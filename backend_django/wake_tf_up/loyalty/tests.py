from django.test import TestCase, override_settings

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
