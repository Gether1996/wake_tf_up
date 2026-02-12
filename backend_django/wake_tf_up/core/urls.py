"""
URLs for core functionality like contact form.
"""
from django.urls import path
from . import views

urlpatterns = [
    path('contact/', views.send_contact_email, name='send_contact_email'),
]
