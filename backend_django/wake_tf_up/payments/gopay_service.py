"""
GoPay Payment Gateway Integration Service
https://doc.gopay.com/

This service handles all GoPay API interactions for payment processing.
"""

import requests
import logging
from typing import Dict, Optional
from decimal import Decimal
from django.conf import settings
from .models import PaymentTransaction

logger = logging.getLogger(__name__)


class GoPayService:
    """
    GoPay payment gateway integration.
    Official API documentation: https://doc.gopay.com/
    """
    
    def __init__(self):
        # Load credentials from environment
        self.client_id = getattr(settings, 'GOPAY_CLIENT_ID', None)  # OAuth2 ClientID
        self.client_secret = getattr(settings, 'GOPAY_CLIENT_SECRET', None)  # OAuth2 Secret
        self.goid = getattr(settings, 'GOPAY_GOID', None)  # Merchant GoID for receiving payments
        self.environment = getattr(settings, 'GOPAY_ENVIRONMENT', 'test')  # 'test' or 'production'
        
        # API endpoints
        if self.environment == 'production':
            self.api_url = "https://gate.gopay.cz/api"
            self.auth_url = "https://gate.gopay.cz/api/oauth2/token"
        else:
            self.api_url = "https://gw.sandbox.gopay.com/api"
            self.auth_url = "https://gw.sandbox.gopay.com/api/oauth2/token"
        
        self._access_token = None
    
    def _get_access_token(self) -> Optional[str]:
        """
        Get OAuth2 access token from GoPay.
        Token is cached and reused until it expires.
        """
        if self._access_token:
            return self._access_token
        
        try:
            response = requests.post(
                self.auth_url,
                data={
                    'grant_type': 'client_credentials',
                    'scope': 'payment-all'
                },
                auth=(self.client_id, self.client_secret),
                headers={'Accept': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self._access_token = data.get('access_token')
                logger.info("Successfully obtained GoPay access token")
                return self._access_token
            else:
                logger.error(f"Failed to get GoPay token: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting GoPay access token: {str(e)}")
            return None
    
    def create_payment(
        self,
        order,
        return_url: str,
        notify_url: str
    ) -> Dict:
        """
        Create a payment in GoPay.
        
        Args:
            order: Order instance
            return_url: URL where user returns after payment
            notify_url: URL for payment status notifications (webhook)
            
        Returns:
            dict with payment details including 'payment_url' and 'transaction_id'
        """
        token = self._get_access_token()
        if not token:
            raise Exception("Failed to authenticate with GoPay")
        
        # Prepare payment data
        amount_cents = int(order.total_amount * 100)  # Convert to cents
        
        payment_data = {
            "payer": {
                "default_payment_instrument": "BANK_ACCOUNT",
                "allowed_payment_instruments": ["BANK_ACCOUNT", "PAYMENT_CARD", "GPAY", "APPLE_PAY"],
                "contact": {
                    "first_name": order.shipping_name.split()[0] if order.shipping_name else "Customer",
                    "last_name": " ".join(order.shipping_name.split()[1:]) if len(order.shipping_name.split()) > 1 else "",
                    "email": order.user.email,
                    "phone_number": order.phone,
                    "city": order.shipping_city,
                    "street": order.shipping_address,
                    "postal_code": order.shipping_postal_code,
                    "country_code": order.shipping_country
                }
            },
            "target": {
                "type": "ACCOUNT",
                "goid": self.goid
            },
            "amount": amount_cents,
            "currency": "EUR",
            "order_number": f"ORDER-{order.id}",
            "order_description": f"Objednávka #{order.id}",
            "items": [
                {
                    "name": item.product.name,
                    "amount": int(item.price_at_purchase * 100),
                    "count": item.quantity,
                    "vat_rate": 20  # Standard VAT rate, adjust if needed
                }
                for item in order.items.all()
            ],
            "callback": {
                "return_url": return_url,
                "notification_url": notify_url
            },
            "lang": "SK"  # Language for payment gateway
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/payments/payment",
                json=payment_data,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                
                # Create transaction record
                transaction = PaymentTransaction.objects.create(
                    order=order,
                    amount=order.total_amount,
                    status='pending',
                    payment_method='gopay',
                    provider='gopay',
                    provider_transaction_id=str(data.get('id')),
                    provider_response=data
                )
                
                return {
                    'success': True,
                    'payment_url': data.get('gw_url'),  # Redirect user here
                    'transaction_id': data.get('id'),
                    'transaction': transaction,
                    'state': data.get('state')
                }
            else:
                logger.error(f"GoPay payment creation failed: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'error': f"Payment creation failed: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Error creating GoPay payment: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def check_payment_status(self, gopay_transaction_id: str) -> Dict:
        """
        Check payment status with GoPay.
        
        Args:
            gopay_transaction_id: GoPay payment ID
            
        Returns:
            dict with payment status information
        """
        token = self._get_access_token()
        if not token:
            raise Exception("Failed to authenticate with GoPay")
        
        try:
            response = requests.get(
                f"{self.api_url}/payments/payment/{gopay_transaction_id}",
                headers={
                    'Authorization': f'Bearer {token}',
                    'Accept': 'application/json'
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'state': data.get('state'),
                    'sub_state': data.get('sub_state'),
                    'amount': data.get('amount'),
                    'currency': data.get('currency'),
                    'payer': data.get('payer'),
                    'data': data
                }
            else:
                logger.error(f"Failed to check payment status: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'error': response.text
                }
                
        except Exception as e:
            logger.error(f"Error checking payment status: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def process_notification(self, gopay_transaction_id: str) -> Dict:
        """
        Process payment notification/webhook from GoPay.
        This should be called when GoPay sends a notification to your webhook URL.
        
        Args:
            gopay_transaction_id: GoPay payment ID from notification
            
        Returns:
            dict with processed payment information
        """
        status_result = self.check_payment_status(gopay_transaction_id)
        
        if not status_result.get('success'):
            return status_result
        
        state = status_result.get('state')
        
        # Update transaction in database
        try:
            transaction = PaymentTransaction.objects.get(
                provider_transaction_id=str(gopay_transaction_id)
            )
            
            # Map GoPay states to our status
            if state == 'PAID':
                transaction.status = 'completed'
                transaction.order.status = 'paid'
                transaction.order.save()
            elif state in ['CANCELED', 'TIMEOUTED']:
                transaction.status = 'failed'
            elif state == 'REFUNDED':
                transaction.status = 'refunded'
                transaction.order.status = 'refunded'
                transaction.order.save()
            
            transaction.provider_response = status_result.get('data')
            transaction.save()
            
            return {
                'success': True,
                'transaction': transaction,
                'state': state
            }
            
        except PaymentTransaction.DoesNotExist:
            logger.error(f"Transaction not found for GoPay ID: {gopay_transaction_id}")
            return {
                'success': False,
                'error': 'Transaction not found'
            }
        except Exception as e:
            logger.error(f"Error processing notification: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def refund_payment(self, gopay_transaction_id: str, amount: Optional[Decimal] = None) -> Dict:
        """
        Request a refund from GoPay.
        
        Args:
            gopay_transaction_id: GoPay payment ID
            amount: Amount to refund (None = full refund)
            
        Returns:
            dict with refund status
        """
        token = self._get_access_token()
        if not token:
            raise Exception("Failed to authenticate with GoPay")
        
        refund_data = {}
        if amount:
            refund_data['amount'] = int(amount * 100)
        
        try:
            response = requests.post(
                f"{self.api_url}/payments/payment/{gopay_transaction_id}/refund",
                json=refund_data,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    'success': True,
                    'state': data.get('state'),
                    'data': data
                }
            else:
                logger.error(f"Refund failed: {response.status_code} - {response.text}")
                return {
                    'success': False,
                    'error': response.text
                }
                
        except Exception as e:
            logger.error(f"Error refunding payment: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
