from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from unittest.mock import patch

from rest_framework.test import APIClient

from .admin import UserAdmin


User = get_user_model()


class UserAdminRoleSyncTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.admin_site = AdminSite()
        self.user_admin = UserAdmin(User, self.admin_site)
        self.superuser = User.objects.create_superuser(
            email='admin@example.com',
            password='testpass123',
        )

    def test_seller_role_sets_is_staff_on_save(self):
        request = self.factory.post('/admin/accounts/user/add/')
        request.user = self.superuser

        user = User(
            email='seller@example.com',
            user_role='seller',
            is_superuser=False,
        )
        user.set_password('testpass123')

        self.user_admin.save_model(request, user, form=None, change=False)

        user.refresh_from_db()
        self.assertTrue(user.is_staff)

    def test_regular_role_removes_is_staff_on_save(self):
        request = self.factory.post('/admin/accounts/user/1/change/')
        request.user = self.superuser

        user = User.objects.create_user(
            email='regular@example.com',
            password='testpass123',
            user_role='regular',
            is_staff=True,
        )

        self.user_admin.save_model(request, user, form=None, change=True)

        user.refresh_from_db()
        self.assertFalse(user.is_staff)


class RegistrationEmailFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch('accounts.views.send_verification_email', return_value=True)
    def test_register_returns_email_sent_true_when_verification_email_succeeds(self, mock_send_verification_email):
        response = self.client.post(
            '/api/v1/auth/register/',
            {
                'email': 'verify-success@example.com',
                'password': 'StrongPass123!',
                'password2': 'StrongPass123!',
                'language': 'en',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.json()['email_sent'])
        created_user = User.objects.get(email='verify-success@example.com')
        mock_send_verification_email.assert_called_once_with(created_user, language='en')

    @patch('accounts.views.send_verification_email', return_value=False)
    def test_register_returns_email_sent_false_when_verification_email_fails(self, mock_send_verification_email):
        response = self.client.post(
            '/api/v1/auth/register/',
            {
                'email': 'verify-fail@example.com',
                'password': 'StrongPass123!',
                'password2': 'StrongPass123!',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.json()['email_sent'])
        self.assertIn('could not send the verification email', response.json()['message'].lower())
        created_user = User.objects.get(email='verify-fail@example.com')
        mock_send_verification_email.assert_called_once_with(created_user, language='sk')

    @patch('accounts.views.send_verification_email', return_value=False)
    def test_resend_verification_returns_500_when_email_send_fails(self, mock_send_verification_email):
        user = User.objects.create_user(
            email='resend-fail@example.com',
            password='StrongPass123!',
            is_email_verified=False,
        )

        response = self.client.post(
            '/api/v1/auth/resend-verification/',
            {
                'email': user.email,
                'language': 'sk',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 500)
        user.refresh_from_db()
        self.assertEqual(mock_send_verification_email.call_count, 1)
