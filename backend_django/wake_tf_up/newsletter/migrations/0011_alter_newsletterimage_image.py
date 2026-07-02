# Generated manually (no Python/Django runtime available in this environment
# to run `makemigrations` — verify with `python manage.py makemigrations
# --check` before applying).

import core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsletter', '0010_blogstemplate_eventstemplate'),
    ]

    operations = [
        migrations.AlterField(
            model_name='newsletterimage',
            name='image',
            field=models.ImageField(help_text='Upload image for newsletter', upload_to='newsletter/images/%Y/%m/', validators=[core.validators.validate_image_extension, core.validators.validate_image_file_size]),
        ),
    ]
