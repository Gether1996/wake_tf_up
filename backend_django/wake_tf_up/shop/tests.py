from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient

from .admin import CategoryAdmin, ColorAdmin, ProductAdmin, TicketAdmin
from .models import Category, Color, Product, Ticket


User = get_user_model()


class ProductSellerAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.factory = RequestFactory()
        self.admin_site = AdminSite()
        self.category_admin = CategoryAdmin(Category, self.admin_site)
        self.color_admin = ColorAdmin(Color, self.admin_site)
        self.product_admin = ProductAdmin(Product, self.admin_site)
        self.ticket_admin = TicketAdmin(Ticket, self.admin_site)

        self.seller = User.objects.create_user(
            email='seller@example.com',
            password='testpass123',
            user_role='seller',
            is_staff=True,
        )
        self.other_seller = User.objects.create_user(
            email='other-seller@example.com',
            password='testpass123',
            user_role='seller',
            is_staff=True,
        )
        self.category = Category.objects.create(name='Tees', slug='tees')
        self.color = Color.objects.create(name='Black', hex_code='#000000')
        self.own_product = Product.objects.create(
            seller=self.seller,
            name='Seller Product',
            slug='seller-product',
            category=self.category,
            price='10.00',
            total_stock=5,
        )
        self.foreign_product = Product.objects.create(
            seller=self.other_seller,
            name='Foreign Product',
            slug='foreign-product',
            category=self.category,
            price='12.00',
            total_stock=3,
        )

    def test_seller_only_sees_own_products_in_admin_api(self):
        self.client.force_authenticate(user=self.seller)

        response = self.client.get('/api/v1/admin/products/')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(len(data['results']), 1)
        self.assertEqual(data['results'][0]['id'], self.own_product.id)

    def test_seller_create_auto_assigns_self(self):
        self.client.force_authenticate(user=self.seller)

        response = self.client.post(
            '/api/v1/admin/products/',
            {
                'name': 'New Seller Product',
                'en_name': '',
                'description': 'Created by seller',
                'en_description': '',
                'slug': 'new-seller-product',
                'category_id': self.category.id,
                'price': '15.00',
                'discount_price': None,
                'total_stock': 7,
                'pre_order_enabled': False,
                'is_limited_drop': False,
                'is_recycled': False,
                'is_published': False,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        created = Product.objects.get(slug='new-seller-product')
        self.assertEqual(created.seller_id, self.seller.id)

    def test_seller_cannot_reassign_product_to_other_seller(self):
        self.client.force_authenticate(user=self.seller)

        response = self.client.patch(
            f'/api/v1/admin/products/{self.own_product.id}/',
            {
                'seller_id': self.other_seller.id,
                'name': 'Seller Product Updated',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.own_product.refresh_from_db()
        self.assertEqual(self.own_product.seller_id, self.seller.id)
        self.assertEqual(self.own_product.name, 'Seller Product Updated')

    def test_seller_cannot_access_foreign_product_via_admin_api(self):
        self.client.force_authenticate(user=self.seller)

        response = self.client.get(f'/api/v1/admin/products/{self.foreign_product.id}/')

        self.assertEqual(response.status_code, 404)

    def test_product_admin_queryset_is_scoped_to_seller(self):
        request = self.factory.get('/admin/shop/product/')
        request.user = self.seller

        queryset = self.product_admin.get_queryset(request)

        self.assertQuerySetEqual(
            queryset.order_by('id'),
            Product.objects.filter(id=self.own_product.id).order_by('id'),
            transform=lambda obj: obj,
        )

    def test_seller_sees_categories_and_colors_read_only(self):
        request = self.factory.get('/admin/shop/category/')
        request.user = self.seller

        self.assertTrue(self.category_admin.has_module_permission(request))
        self.assertTrue(self.category_admin.has_view_permission(request))
        self.assertFalse(self.category_admin.has_add_permission(request))
        self.assertFalse(self.category_admin.has_change_permission(request))
        self.assertFalse(self.category_admin.has_delete_permission(request))

        self.assertTrue(self.color_admin.has_module_permission(request))
        self.assertTrue(self.color_admin.has_view_permission(request))
        self.assertFalse(self.color_admin.has_add_permission(request))

    def test_seller_does_not_see_tickets_admin(self):
        request = self.factory.get('/admin/shop/ticket/')
        request.user = self.seller

        self.assertFalse(self.ticket_admin.has_module_permission(request))
