# Generated manually (no Python/Django runtime available in this environment
# to run `makemigrations` — verify with `python manage.py makemigrations
# --check` before applying).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('newsletter', '0011_alter_newsletterimage_image'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='subscriber',
            index=models.Index(fields=['is_active'], name='sub_is_active_idx'),
        ),
    ]
