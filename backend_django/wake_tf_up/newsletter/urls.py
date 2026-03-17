from django.urls import path
from .views import (
    SubscribeView,
    UnsubscribeView,
    NewsletterPopupTrackView,
    NewsletterImageListView,
    newsletter_template_preview,
    discount_template_preview,
    events_template_preview,
    blogs_template_preview,
)

app_name = 'newsletter'

urlpatterns = [
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
    path('unsubscribe/', UnsubscribeView.as_view(), name='unsubscribe'),
    path('popup-track/', NewsletterPopupTrackView.as_view(), name='popup-track'),
    path('images/', NewsletterImageListView.as_view(), name='newsletter-images'),
    # Admin preview URLs
    path('admin/newsletter-preview/<int:pk>/', newsletter_template_preview, name='newsletter_template_preview'),
    path('admin/discount-preview/<int:pk>/', discount_template_preview, name='discount_template_preview'),
    path('admin/events-preview/<int:pk>/', events_template_preview, name='events_template_preview'),
    path('admin/blogs-preview/<int:pk>/', blogs_template_preview, name='blogs_template_preview'),
]
