"""
Management command to send review request emails for delivered orders.
This should be run periodically (e.g., daily cron job).
"""
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from orders.models import Order
from reviews.models import ReviewToken
from core.email_utils import get_email_language, send_localized_email
from settings.models import MainSettings

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send review request emails for orders delivered X days ago'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be sent without actually sending emails',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get settings
        settings_obj = MainSettings.get_settings()
        days_after_delivery = settings_obj.review_email_days_after_delivery
        
        self.stdout.write(f'Checking for orders delivered {days_after_delivery} days ago...')
        
        # Calculate the target datetime
        target_date = timezone.now() - timedelta(days=days_after_delivery)
        
        # Find orders that:
        # 1. Are delivered
        # 2. Were delivered around X days ago (with 1 day tolerance)
        # 3. Haven't received review request email yet
        eligible_orders = Order.objects.filter(
            status='delivered',
            delivered_at__isnull=False,
            delivered_at__lte=target_date,
            review_request_sent_at__isnull=True
        ).order_by('delivered_at')
        
        count = eligible_orders.count()
        self.stdout.write(f'Found {count} orders eligible for review request emails')
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No orders to process.'))
            return
        
        sent_count = 0
        error_count = 0
        
        for order in eligible_orders:
            try:
                if dry_run:
                    self.stdout.write(
                        f'[DRY RUN] Would send review request for Order #{order.id} '
                        f'(delivered: {order.delivered_at}, user: {order.user.email})'
                    )
                    continue
                
                # Check if we already have review tokens for this order
                existing_tokens = ReviewToken.objects.filter(order=order).exists()
                
                if not existing_tokens:
                    # Generate review tokens for all products in the order
                    tokens = ReviewToken.create_for_order(order)
                    
                    if not tokens:
                        self.stdout.write(
                            self.style.WARNING(f'No tokens created for Order #{order.id} (no items?)')
                        )
                        # Mark as sent anyway to avoid retrying
                        order.review_request_sent_at = timezone.now()
                        order.save(update_fields=['review_request_sent_at'])
                        continue
                else:
                    # Use existing tokens
                    tokens = ReviewToken.objects.filter(order=order)
                
                # Get language from user
                language_code = get_email_language(user=order.user)
                
                # Prepare email context
                base_url = getattr(settings, 'FRONTEND_URL', 'https://wake-tf-up.eu').rstrip('/')
                context = {
                    'user': order.user,
                    'order': order,
                    'tokens': tokens,
                    'base_url': base_url,
                    'review_url': f"{base_url}/{language_code}/review/submit"
                }
                
                # Send localized email
                send_localized_email(
                    subject_sk=f'Ohodnoťte Vašu objednávku #{order.id}',
                    subject_en=f'Rate Your Order #{order.id}',
                    template_path='orders/review_request_email.html',
                    context=context,
                    recipient_list=[order.user.email],
                    language=language_code
                )
                
                # Mark as sent
                order.review_request_sent_at = timezone.now()
                order.save(update_fields=['review_request_sent_at'])
                
                sent_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Sent review request for Order #{order.id} to {order.user.email}'
                    )
                )
                
            except Exception as e:
                error_count += 1
                logger.error(
                    f'Failed to send review request for Order #{order.id}: {e}',
                    exc_info=True
                )
                self.stdout.write(
                    self.style.ERROR(
                        f'✗ Failed for Order #{order.id}: {str(e)}'
                    )
                )
        
        # Summary
        self.stdout.write('\n' + '='*60)
        if dry_run:
            self.stdout.write(self.style.SUCCESS(f'DRY RUN: Would send {count} emails'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Successfully sent: {sent_count} emails'))
            if error_count > 0:
                self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write('='*60)
