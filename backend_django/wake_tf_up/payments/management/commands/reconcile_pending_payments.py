from django.core.management.base import BaseCommand

from payments.reconciliation import reconcile_pending_gopay_transactions


class Command(BaseCommand):
    help = "Reconcile stale pending GoPay transactions and finalize paid orders."

    def add_arguments(self, parser):
        parser.add_argument(
            '--older-than-minutes',
            type=int,
            default=5,
            help='Only reconcile pending payments older than this many minutes.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Maximum number of pending payments to reconcile in one run.',
        )

    def handle(self, *args, **options):
        summary = reconcile_pending_gopay_transactions(
            older_than_minutes=options['older_than_minutes'],
            limit=options['limit'],
            source='Payment Reconcile Command',
        )
        self.stdout.write(
            self.style.SUCCESS(
                "checked={checked} updated={updated} paid={paid} failed={failed} refunded={refunded} errors={errors}".format(
                    **summary
                )
            )
        )
