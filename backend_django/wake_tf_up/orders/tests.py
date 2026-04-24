from django.contrib.auth import get_user_model
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .access import get_guest_order_access_token
from .models import Order, OrderItem, PurchasedTicket
from .admin import OrderItemInline, PurchasedTicketAdmin
from settings.models import MainSettings
from shop.models import Category, Product, Ticket
from payments.models import PaymentTransaction


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


class OrderCreateShippingAvailabilityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.ticket = Ticket.objects.create(
            name='Wake TF Up Ticket',
            slug='wake-tf-up-ticket',
            price='8.50',
            total_quantity=10,
            is_published=True,
        )
        self.settings = MainSettings.get_settings()

    def test_disabled_shipping_method_is_rejected_by_order_create(self):
        self.settings.digital_delivery_enabled = False
        self.settings.save(update_fields=['digital_delivery_enabled'])

        response = self.client.post(
            '/api/v1/orders/create/',
            {
                'shipping_method': 'digital_delivery',
                'payment_method': 'gopay',
                'shipping_name': 'Guest Buyer',
                'email': 'guest@example.com',
                'shipping_address': 'Digital delivery',
                'shipping_city': 'Bratislava',
                'shipping_postal_code': '81101',
                'shipping_country': 'SK',
                'phone': '+421900000000',
                'items': [
                    {
                        'ticket_id': self.ticket.id,
                        'quantity': 1,
                    }
                ],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('shipping_method', response.json())


class SellerOrderAdminAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.factory = RequestFactory()
        self.order_item_inline = OrderItemInline(Order, AdminSite())
        self.purchased_ticket_admin = PurchasedTicketAdmin(PurchasedTicket, AdminSite())
        self.seller = User.objects.create_user(
            email='seller@example.com',
            password='testpass123',
            user_role='seller',
            is_staff=True,
        )
        self.other_seller = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            user_role='seller',
            is_staff=True,
        )
        self.category = Category.objects.create(name='Merch', slug='merch')
        self.seller_product = Product.objects.create(
            seller=self.seller,
            name='Seller Hoodie',
            slug='seller-hoodie',
            category=self.category,
            price='25.00',
            total_stock=10,
        )
        self.other_product = Product.objects.create(
            seller=self.other_seller,
            name='Other Hoodie',
            slug='other-hoodie',
            category=self.category,
            price='30.00',
            total_stock=10,
        )
        self.ticket = Ticket.objects.create(
            name='Event Ticket',
            slug='event-ticket',
            price='8.50',
            total_quantity=10,
            is_published=True,
        )

    def create_order(self):
        return Order.objects.create(
            status='created',
            shipping_method='pickup',
            payment_method='gopay',
            shipping_name='Buyer',
            email='buyer@example.com',
            shipping_address='Main Street 1',
            shipping_city='Bratislava',
            shipping_postal_code='81101',
            shipping_country='SK',
            phone='+421900000000',
            shipping_cost='0.00',
            total_amount='25.00',
            language='sk',
        )

    def test_seller_lists_only_related_orders(self):
        own_order = self.create_order()
        foreign_order = self.create_order()
        OrderItem.objects.create(order=own_order, product=self.seller_product, quantity=1)
        OrderItem.objects.create(order=foreign_order, product=self.other_product, quantity=1)

        self.client.force_authenticate(user=self.seller)
        response = self.client.get('/api/v1/orders/admin/orders/')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(len(data['results']), 1)
        self.assertEqual(data['results'][0]['id'], own_order.id)
        self.assertEqual(len(data['results'][0]['items']), 1)
        self.assertEqual(data['results'][0]['items'][0]['product']['id'], self.seller_product.id)
        self.assertIsNone(data['results'][0]['guest_access_token'])
        self.assertIsNone(data['results'][0]['frontend_order_url'])

    def test_seller_can_update_status_for_exclusive_own_order(self):
        order = self.create_order()
        OrderItem.objects.create(order=order, product=self.seller_product, quantity=1)

        self.client.force_authenticate(user=self.seller)
        response = self.client.post(
            f'/api/v1/orders/admin/orders/{order.id}/update_status/',
            {'status': 'shipped'},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'shipped')
        response_data = response.json()
        self.assertIsNone(response_data['guest_access_token'])
        self.assertIsNone(response_data['frontend_order_url'])
        self.assertEqual(len(response_data['items']), 1)
        self.assertEqual(response_data['items'][0]['product']['id'], self.seller_product.id)

    def test_seller_cannot_update_status_to_paid_via_admin_api(self):
        order = self.create_order()
        OrderItem.objects.create(order=order, product=self.seller_product, quantity=1)

        self.client.force_authenticate(user=self.seller)
        response = self.client.post(
            f'/api/v1/orders/admin/orders/{order.id}/update_status/',
            {'status': 'paid'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'created')

    def test_seller_cannot_update_status_for_mixed_order(self):
        order = self.create_order()
        OrderItem.objects.create(order=order, product=self.seller_product, quantity=1)
        OrderItem.objects.create(order=order, product=self.other_product, quantity=1)

        self.client.force_authenticate(user=self.seller)
        response = self.client.post(
            f'/api/v1/orders/admin/orders/{order.id}/update_status/',
            {'status': 'shipped'},
            format='json',
        )

        self.assertEqual(response.status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, 'created')

    def test_seller_only_sees_related_payment_transactions(self):
        own_order = self.create_order()
        foreign_order = self.create_order()
        OrderItem.objects.create(order=own_order, product=self.seller_product, quantity=1)
        OrderItem.objects.create(order=foreign_order, product=self.other_product, quantity=1)
        own_tx = PaymentTransaction.objects.create(order=own_order, amount='25.00')
        PaymentTransaction.objects.create(order=foreign_order, amount='30.00')

        self.client.force_authenticate(user=self.seller)
        response = self.client.get('/api/v1/payments/admin/transactions/')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(len(data['results']), 1)
        self.assertEqual(data['results'][0]['id'], own_tx.id)

    def test_seller_does_not_see_purchased_tickets_admin(self):
        request = type('Request', (), {'user': self.seller})()
        self.assertFalse(self.purchased_ticket_admin.has_module_permission(request))

    def test_order_item_inline_queryset_is_scoped_without_runtime_error(self):
        order = self.create_order()
        OrderItem.objects.create(order=order, product=self.seller_product, quantity=1)
        OrderItem.objects.create(order=order, product=self.other_product, quantity=1)
        request = self.factory.get('/admin/orders/order/1/change/')
        request.user = self.seller

        queryset = self.order_item_inline.get_queryset(request)

        self.assertTrue(hasattr(queryset, 'filter'))
