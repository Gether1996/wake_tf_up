from django.urls import path
from .views import (
    UserDiscountCodesView,
    ValidateDiscountCodeView,
    GenerateLoyaltyCodeView,
    DiscountCodeDetailView,
    QRCodeScanView
)

app_name = 'loyalty'

urlpatterns = [
    path('my-codes/', UserDiscountCodesView.as_view(), name='my-codes'),
    path('validate-code/', ValidateDiscountCodeView.as_view(), name='validate-code'),
    path('generate-loyalty-code/', GenerateLoyaltyCodeView.as_view(), name='generate-loyalty-code'),
    path('discount-codes/<int:pk>/', DiscountCodeDetailView.as_view(), name='discount-code-detail'),
    path('qr/<str:code>/', QRCodeScanView.as_view(), name='qr-scan'),
]
