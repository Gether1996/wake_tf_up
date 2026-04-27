from django.test import SimpleTestCase

from .email_utils import get_localized_template


class LocalizedEmailTemplateResolutionTests(SimpleTestCase):
    def test_accounts_email_templates_use_existing_underscore_variant(self):
        template_name = get_localized_template('emails/email_verification.html', 'en')

        self.assertEqual(template_name, 'emails/email_verification_en.html')

    def test_newsletter_email_templates_use_existing_dot_variant(self):
        template_name = get_localized_template('newsletter/subscription_confirmation_email.html', 'en')

        self.assertEqual(template_name, 'newsletter/subscription_confirmation_email.en.html')