from django.urls import path
from .views import ProductEventCreateView

app_name = 'analytics'

urlpatterns = [
    path('events/', ProductEventCreateView.as_view(), name='event-create'),
]
