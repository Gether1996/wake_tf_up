from django.urls import path
from .views import SubscribeView, NewsletterPopupTrackView

app_name = 'newsletter'

urlpatterns = [
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
    path('popup-track/', NewsletterPopupTrackView.as_view(), name='popup-track'),
]
