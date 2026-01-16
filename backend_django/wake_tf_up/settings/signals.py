from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.apps import apps


@receiver(post_migrate)
def create_default_settings(sender, **kwargs):
    """
    Create default MainSettings instance if none exists.
    This runs after every migration.
    """
    if sender.name == 'settings':
        MainSettings = apps.get_model('settings', 'MainSettings')
        if not MainSettings.objects.exists():
            MainSettings.objects.create()
            print("✓ Created default MainSettings instance")
