# Generated manually (no Python/Django runtime available in this environment
# to run `makemigrations` — verify with `python manage.py makemigrations
# --check` before applying).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_alter_paymenttransaction_options'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='paymenttransaction',
            index=models.Index(fields=['provider', 'status', 'created_at'], name='pmt_tx_provider_status_idx'),
        ),
    ]
