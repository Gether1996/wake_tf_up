from urllib.parse import parse_qs, urlsplit

from django.contrib.admin.sites import AdminSite
from django.core import mail
from django.test import RequestFactory, TestCase, override_settings

from .admin import NewsletterTemplateAdmin, SubscriberAdmin
from .email_utils import build_unsubscribe_url
from .models import NewsletterTemplate, Subscriber


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='noreply@example.com',
    FRONTEND_URL='https://frontend.example',
)
class NewsletterFlowTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.messages = []
        self.subscriber_admin = SubscriberAdmin(Subscriber, AdminSite())
        self.newsletter_template_admin = NewsletterTemplateAdmin(NewsletterTemplate, AdminSite())
        self.subscriber_admin.message_user = self._record_message
        self.newsletter_template_admin.message_user = self._record_message

    def _record_message(self, request, message, level=None):
        self.messages.append((message, level))

    def _request(self, path):
        request = self.factory.post(path)
        request.LANGUAGE_CODE = 'sk'
        return request

    def test_unsubscribe_link_handles_plus_email_and_token(self):
        subscriber = Subscriber.objects.create(email='plus+alias@example.com', is_active=True)
        unsubscribe_url = build_unsubscribe_url(subscriber.email, 'sk')
        parsed = urlsplit(unsubscribe_url)
        params = parse_qs(parsed.query)

        response = self.client.get('/api/v1/newsletter/unsubscribe/', {
            'email': params['email'][0],
            'token': params['token'][0],
        })

        self.assertEqual(response.status_code, 200)
        subscriber.refresh_from_db()
        self.assertFalse(subscriber.is_active)
        self.assertIn('token=', unsubscribe_url)
        self.assertIn('plus%2Balias%40example.com', unsubscribe_url)

    def test_selected_bulk_newsletter_skips_inactive_subscribers(self):
        template = NewsletterTemplate.load()
        template.subject = 'Novinky'
        template.content_html = '<a href="{{ unsubscribe_url }}">Odhlasit sa</a>'
        template.save()

        active_subscriber = Subscriber.objects.create(email='active+news@example.com', is_active=True)
        Subscriber.objects.create(email='inactive@example.com', is_active=False)

        request = self._request('/admin/newsletter/subscriber/')
        queryset = Subscriber.objects.all()

        self.subscriber_admin.send_bulk_newsletter_news(request, queryset)

        self.assertEqual(len(mail.outbox), 1)
        expected_link = build_unsubscribe_url(active_subscriber.email, 'sk')
        expected_html_link = expected_link.replace('&', '&amp;')
        self.assertEqual(mail.outbox[0].to, [active_subscriber.email])
        self.assertIn(expected_link, mail.outbox[0].body)
        self.assertIn(expected_html_link, mail.outbox[0].alternatives[0][0])
        self.assertTrue(any('neaktivnych odberatelov' in str(message) for message, _ in self.messages))

    def test_send_to_all_newsletter_uses_tokenized_unsubscribe_link(self):
        template = NewsletterTemplate.load()
        template.subject = 'Novinky vsetkym'
        template.content_html = '<p>{{ email }}</p><a href="{{ unsubscribe_url }}">Odhlasit sa</a>'
        template.save()

        active_subscriber = Subscriber.objects.create(email='all+active@example.com', is_active=True)
        Subscriber.objects.create(email='all-inactive@example.com', is_active=False)

        request = self._request('/admin/newsletter/newslettertemplate/')

        self.newsletter_template_admin.send_to_all_subscribers(
            request,
            NewsletterTemplate.objects.filter(pk=template.pk),
        )

        self.assertEqual(len(mail.outbox), 1)
        expected_link = build_unsubscribe_url(active_subscriber.email, 'sk')
        expected_html_link = expected_link.replace('&', '&amp;')
        self.assertEqual(mail.outbox[0].to, [active_subscriber.email])
        self.assertIn(expected_link, mail.outbox[0].body)
        self.assertIn(expected_html_link, mail.outbox[0].alternatives[0][0])
