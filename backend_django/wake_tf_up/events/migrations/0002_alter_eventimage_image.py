# Generated manually (no Python/Django runtime available in this environment
# to run `makemigrations` — verify with `python manage.py makemigrations
# --check` before applying).

import core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='eventimage',
            name='image',
            field=models.ImageField(help_text='Upload image', upload_to='events/images/%Y/%m/', validators=[core.validators.validate_image_extension, core.validators.validate_image_file_size]),
        ),
    ]
