# Generated manually (no Python/Django runtime available in this environment
# to run `makemigrations` — verify with `python manage.py makemigrations
# --check` before applying).

import core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('blog', '0004_alter_blogimage_options_alter_blogpost_options'),
    ]

    operations = [
        migrations.AlterField(
            model_name='blogimage',
            name='image',
            field=models.ImageField(help_text='Upload image', upload_to='blog/images/%Y/%m/', validators=[core.validators.validate_image_extension, core.validators.validate_image_file_size]),
        ),
    ]
