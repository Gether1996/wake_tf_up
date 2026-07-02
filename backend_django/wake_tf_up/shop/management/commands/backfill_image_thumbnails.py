"""
One-off backfill for the ProductImage/TicketImage `thumbnail` field.

New rows get a thumbnail generated automatically on save (see
ProductImage.save() / TicketImage.save() in shop/models.py). This command
only needs to run once, after deploying that change, to fill in thumbnails
for images uploaded before it existed.

Usage: python manage.py backfill_image_thumbnails [--dry-run]
"""
import logging

from django.core.management.base import BaseCommand

from core.image_processing import make_thumbnail
from shop.models import ProductImage, TicketImage

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate missing thumbnails for existing ProductImage/TicketImage rows'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Report how many images need a thumbnail without generating one',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        for model in (ProductImage, TicketImage):
            queryset = model.objects.exclude(image='').filter(thumbnail='')
            total = queryset.count()
            self.stdout.write(f"{model.__name__}: {total} image(s) missing a thumbnail")

            if dry_run or total == 0:
                continue

            generated = 0
            failed = 0
            for instance in queryset.iterator():
                thumb = make_thumbnail(instance.image)
                if not thumb:
                    failed += 1
                    logger.warning("Could not generate thumbnail for %s #%s", model.__name__, instance.pk)
                    continue
                instance.thumbnail.save(thumb.name, thumb, save=False)
                instance.save(update_fields=['thumbnail'])
                generated += 1

            self.stdout.write(self.style.SUCCESS(
                f"{model.__name__}: generated {generated}, failed {failed}"
            ))
