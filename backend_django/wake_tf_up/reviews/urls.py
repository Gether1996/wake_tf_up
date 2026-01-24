from django.urls import path
from .views import ReviewCreateView, ReviewListView, ReviewViaTokenView, FeaturedReviewsView

app_name = 'reviews'

urlpatterns = [
    path('', ReviewListView.as_view(), name='review-list'),
    path('create/', ReviewCreateView.as_view(), name='review-create'),
    path('submit-via-token/', ReviewViaTokenView.as_view(), name='review-via-token'),
    path('featured/', FeaturedReviewsView.as_view(), name='review-featured'),
]
