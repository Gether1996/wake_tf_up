from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0013_guest_order_nullable_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='email',
            field=models.EmailField(
                blank=True,
                default='',
                help_text='Customer email (stored directly on order, works for guest orders too)',
                max_length=254,
            ),
        ),
    ]
