"""
Auto-cancel unpaid orders so they stop holding stock indefinitely.

An order that never completes payment stays in 'created' status forever
unless something explicitly cancels it — and Product.available_stock counts
all 'created' orders as reserved, so an abandoned checkout can permanently
lock inventory for a limited-stock item. Run this periodically (see
entrypoint.sh) to cancel orders that have sat unpaid past a cutoff.
"""
import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand

from orders.models import Order, StockReservationService
from payments.models import PaymentTransaction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Cancel orders that have been unpaid ('created') for longer than the cutoff, freeing their reserved stock."

    def add_arguments(self, parser):
        parser.add_argument(
            '--older-than-hours',
            type=float,
            default=24,
            help='Cancel orders created more than this many hours ago that are still unpaid.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=200,
            help='Maximum number of orders to cancel in one run.',
        )

    def handle(self, *args, **options):
        cutoff = datetime.now() - timedelta(hours=options['older_than_hours'])
        orders = Order.objects.filter(
            status='created',
            created_at__lte=cutoff,
        ).order_by('created_at')[:options['limit']]

        cancelled = 0
        for order in orders:
            PaymentTransaction.objects.filter(
                order=order,
                status='pending',
            ).update(status='failed')

            StockReservationService.cancel_order(order)
            logger.info(
                "[Cancel Stale Orders] Cancelled order #%s (created_at=%s, unpaid past %sh cutoff)",
                order.id,
                order.created_at,
                options['older_than_hours'],
            )
            cancelled += 1

        self.stdout.write(self.style.SUCCESS(f"Cancelled {cancelled} stale unpaid order(s)."))
