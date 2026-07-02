# Generated manually (no Python/Django runtime available in this environment
# to run `makemigrations` — verify with `python manage.py makemigrations
# --check` before applying).

import core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0009_product_seller_product_products_seller__c70854_idx_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='productimage',
            name='image',
            field=models.ImageField(upload_to='products/%Y/%m/', validators=[core.validators.validate_image_extension, core.validators.validate_image_file_size]),
        ),
        migrations.AddField(
            model_name='productimage',
            name='thumbnail',
            field=models.ImageField(blank=True, editable=False, help_text='Auto-generated on save from `image`; do not upload directly.', null=True, upload_to='products/thumbnails/%Y/%m/'),
        ),
        migrations.AlterField(
            model_name='productvideo',
            name='thumbnail',
            field=models.ImageField(blank=True, null=True, upload_to='products/video_thumbnails/%Y/%m/', validators=[core.validators.validate_image_extension, core.validators.validate_image_file_size]),
        ),
        migrations.AlterField(
            model_name='ticketimage',
            name='image',
            field=models.ImageField(upload_to='tickets/%Y/%m/', validators=[core.validators.validate_image_extension, core.validators.validate_image_file_size]),
        ),
        migrations.AddField(
            model_name='ticketimage',
            name='thumbnail',
            field=models.ImageField(blank=True, editable=False, help_text='Auto-generated on save from `image`; do not upload directly.', null=True, upload_to='tickets/thumbnails/%Y/%m/'),
        ),
    ]
