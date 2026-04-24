from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

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
