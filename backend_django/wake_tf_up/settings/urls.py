from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MainSettingsViewSet

router = DefaultRouter()
router.register(r'', MainSettingsViewSet, basename='mainsettings')

urlpatterns = [
    path('', include(router.urls)),
]
