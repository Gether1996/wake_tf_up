"""
GoPay Payment Gateway Integration Service
https://doc.gopay.com/

This service handles all GoPay API interactions for payment processing.
"""

import json
import logging
from decimal import Decimal
from typing import Dict, Optional

import requests
from django.conf import settings

from .models import PaymentTransaction
from .reconciliation import apply_gopay_status_to_transaction


logger = logging.getLogger(__name__)

GOPAY_REQUEST_TIMEOUT = 10  # seconds; prevents hung GoPay calls from exhausting gunicorn workers


class GoPayService:
    """
    GoPay payment gateway integration.
    Official API documentation: https://doc.gopay.com/
    """

    def __init__(self):
        self.client_id = getattr(settings, 'GOPAY_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'GOPAY_CLIENT_SECRET', None)
        self.goid = getattr(settings, 'GOPAY_GOID', None)
        self.environment = getattr(settings, 'GOPAY_ENVIRONMENT', 'test')

        if self.environment == 'production':
            self.api_url = "https://gate.gopay.cz/api"
            self.auth_url = "https://gate.gopay.cz/api/oauth2/token"
        else:
            self.api_url = "https://gw.sandbox.gopay.com/api"
            self.auth_url = "https://gw.sandbox.gopay.com/api/oauth2/token"

        self._access_token = None

    def _get_access_token(self) -> Optional[str]:
        """Get and cache the OAuth2 access token from GoPay."""
        if self._access_token:
            logger.debug("[GoPay OAuth2] Using cached access token")
            return self._access_token

        logger.info("[GoPay OAuth2] Requesting token from %s", self.auth_url)
        logger.debug(
            "[GoPay OAuth2] Client ID preview: %s",
            f"{self.client_id[:4]}...{self.client_id[-4:]}" if self.client_id else 'N/A',
        )

        try:
            response = requests.post(
                self.auth_url,
                data={'grant_type': 'client_credentials', 'scope': 'payment-all'},
                auth=(self.client_id, self.client_secret),
                headers={'Accept': 'application/json'},
                timeout=GOPAY_REQUEST_TIMEOUT,
            )
            logger.debug("[GoPay OAuth2] Response status: %s", response.status_code)

            if response.status_code == 200:
                data = response.json()
                self._access_token = data.get('access_token')
                token_preview = self._access_token[:10] + '...' if self._access_token else 'None'
                logger.info("[GoPay OAuth2] Access token acquired: %s", token_preview)
                return self._access_token

            logger.error("[GoPay OAuth2] Failed to get token: %s", response.status_code)
            logger.error("[GoPay OAuth2] Response body: %s", response.text)
            return None
        except Exception as exc:
            logger.error("[GoPay OAuth2] Exception while requesting token: %s", exc, exc_info=True)
            return None

    def create_payment(self, order, return_url: str, notify_url: str) -> Dict:
        """
        Create a payment in GoPay.

        Returns a dict with payment details including payment_url and transaction_id.
        """
        token = self._get_access_token()
        if not token:
            raise Exception("Failed to authenticate with GoPay")

        logger.info("[GoPay Payment] Starting payment creation for order #%s", order.id)
        logger.debug("[GoPay Payment] Environment: %s", self.environment)
        logger.debug("[GoPay Payment] API URL: %s", self.api_url)

        if not self.goid:
            logger.error("[GoPay Payment] GOPAY_GOID not configured")
            raise Exception("GOPAY_GOID not configured in settings. Please add GOPAY_GOID to .env file.")

        amount_cents = int(order.total_amount * 100)
        payment_data = {
            "payer": {
                "contact": {
                    "first_name": order.shipping_name.split()[0] if order.shipping_name else "Customer",
                    "last_name": " ".join(order.shipping_name.split()[1:])
                    if len(order.shipping_name.split()) > 1 else "",
                    "email": order.email or (order.user.email if order.user else ""),
                    "phone_number": order.phone,
                    "city": order.shipping_city,
                    "street": order.shipping_address,
                    "postal_code": order.shipping_postal_code,
                    "country_code": order.shipping_country,
                }
            },
            "target": {"type": "ACCOUNT", "goid": self.goid},
            "amount": amount_cents,
            "currency": "EUR",
            "order_number": f"ORDER-{order.id}",
            "order_description": f"Objednavka #{order.id}",
            "items": [
                {
                    "name": (
                        item.product.name
                        if item.product else item.ticket.name if item.ticket else "Item"
                    ),
                    "amount": int(item.price_at_purchase * 100),
                    "count": item.quantity,
                    "vat_rate": 20,
                }
                for item in order.items.all()
            ],
            "callback": {
                "return_url": return_url,
                "notification_url": notify_url,
            },
            "lang": "SK",
        }

        logger.info(
            "[GoPay Payment] Order #%s | amount=%.2f EUR | return_url=%s | notify_url=%s",
            order.id,
            amount_cents / 100,
            return_url,
            notify_url,
        )
        logger.debug(
            "[GoPay Payment] Request payload:\n%s",
            json.dumps(payment_data, indent=2, ensure_ascii=False),
        )

        try:
            response = requests.post(
                f"{self.api_url}/payments/payment",
                json=payment_data,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                timeout=GOPAY_REQUEST_TIMEOUT,
            )
            logger.debug("[GoPay Payment] Response status: %s", response.status_code)

            if response.status_code in [200, 201]:
                data = response.json()
                logger.info(
                    "[GoPay Payment] Payment created successfully | provider_id=%s | state=%s",
                    data.get('id'),
                    data.get('state'),
                )
                logger.debug(
                    "[GoPay Payment] Response payload:\n%s",
                    json.dumps(data, indent=2, ensure_ascii=False),
                )

                transaction = PaymentTransaction.objects.create(
                    order=order,
                    amount=order.total_amount,
                    status='pending',
                    payment_method='gopay',
                    provider='gopay',
                    provider_transaction_id=str(data.get('id')),
                    provider_response=data,
                )
                logger.info("[GoPay Payment] Created local transaction #%s", transaction.id)
                return {
                    'success': True,
                    'payment_url': data.get('gw_url'),
                    'transaction_id': data.get('id'),
                    'transaction': transaction,
                    'state': data.get('state'),
                }

            logger.error("[GoPay Payment] Payment creation failed: HTTP %s", response.status_code)
            logger.error("[GoPay Payment] Response body: %s", response.text)
            try:
                error_data = response.json()
                logger.error(
                    "[GoPay Payment] Parsed error:\n%s",
                    json.dumps(error_data, indent=2, ensure_ascii=False),
                )
            except Exception:
                pass
            return {'success': False, 'error': f"Payment creation failed: {response.text}"}
        except Exception as exc:
            logger.error("[GoPay Payment] Exception during payment creation: %s", exc, exc_info=True)
            return {'success': False, 'error': str(exc)}

    def check_payment_status(self, gopay_transaction_id: str) -> Dict:
        """Check payment status with GoPay."""
        logger.info("[GoPay Status] Checking status for provider transaction %s", gopay_transaction_id)

        token = self._get_access_token()
        if not token:
            logger.error("[GoPay Status] Failed to authenticate with GoPay")
            raise Exception("Failed to authenticate with GoPay")

        try:
            url = f"{self.api_url}/payments/payment/{gopay_transaction_id}"
            response = requests.get(
                url,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Accept': 'application/json',
                },
                timeout=GOPAY_REQUEST_TIMEOUT,
            )
            logger.debug("[GoPay Status] Response status: %s", response.status_code)

            if response.status_code == 200:
                data = response.json()
                logger.info(
                    "[GoPay Status] State=%s | sub_state=%s for provider transaction %s",
                    data.get('state'),
                    data.get('sub_state'),
                    gopay_transaction_id,
                )
                logger.debug(
                    "[GoPay Status] Response payload:\n%s",
                    json.dumps(data, indent=2, ensure_ascii=False),
                )
                return {
                    'success': True,
                    'state': data.get('state'),
                    'sub_state': data.get('sub_state'),
                    'amount': data.get('amount'),
                    'currency': data.get('currency'),
                    'payer': data.get('payer'),
                    'data': data,
                }

            logger.error("[GoPay Status] Failed: %s - %s", response.status_code, response.text)
            return {'success': False, 'error': response.text}
        except Exception as exc:
            logger.error("[GoPay Status] Exception: %s", exc, exc_info=True)
            return {'success': False, 'error': str(exc)}

    def process_notification(self, gopay_transaction_id: str) -> Dict:
        """
        Process a GoPay webhook notification.

        Returns the updated local transaction and provider state.
        """
        logger.info("[GoPay Webhook] Processing notification for provider transaction %s", gopay_transaction_id)
        status_result = self.check_payment_status(gopay_transaction_id)
        if not status_result.get('success'):
            return status_result

        state = status_result.get('state')
        try:
            transaction = PaymentTransaction.objects.select_related('order').get(
                provider_transaction_id=str(gopay_transaction_id)
            )
            apply_gopay_status_to_transaction(
                transaction,
                status_result,
                source='GoPay Webhook',
            )
            transaction.refresh_from_db(fields=['status', 'provider_response'])
            logger.info(
                "[GoPay Webhook] Transaction #%s processed | local_status=%s | provider_state=%s",
                transaction.id,
                transaction.status,
                state,
            )
            return {
                'success': True,
                'transaction': transaction,
                'state': state,
            }
        except PaymentTransaction.DoesNotExist:
            logger.error("[GoPay Webhook] Transaction not found for provider ID %s", gopay_transaction_id)
            return {'success': False, 'error': 'Transaction not found'}
        except Exception as exc:
            logger.error("[GoPay Webhook] Exception: %s", exc, exc_info=True)
            return {'success': False, 'error': str(exc)}

    def refund_payment(self, gopay_transaction_id: str, amount: Optional[Decimal] = None) -> Dict:
        """Request a refund from GoPay."""
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
                    'Accept': 'application/json',
                },
                timeout=GOPAY_REQUEST_TIMEOUT,
            )

            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    'success': True,
                    'state': data.get('state'),
                    'data': data,
                }

            logger.error("[GoPay Refund] Failed: %s - %s", response.status_code, response.text)
            return {'success': False, 'error': response.text}
        except Exception as exc:
            logger.error("[GoPay Refund] Exception: %s", exc, exc_info=True)
            return {'success': False, 'error': str(exc)}
