# GoPay Payment Integration

This document describes the GoPay payment gateway integration for the Wake TF Up e-commerce platform.

## Overview

The integration allows customers to pay for their orders using GoPay payment gateway, which supports:
- Credit/Debit cards
- Bank transfers
- Online banking

## Architecture

### Backend (Django)

**Files:**
- `backend_django/wake_tf_up/payments/models.py` - Payment transaction model
- `backend_django/wake_tf_up/payments/gopay_service.py` - GoPay API integration service
- `backend_django/wake_tf_up/payments/views.py` - Payment API endpoints
- `backend_django/wake_tf_up/payments/urls.py` - Payment URL routing
- `backend_django/wake_tf_up/payments/serializers.py` - Payment serializers

**Models:**
- `PaymentTransaction` - Tracks all payment attempts and their statuses

**API Endpoints:**
- `POST /api/v1/payments/create/` - Create a GoPay payment for an order
- `GET /api/v1/payments/return/` - Handle user return from GoPay
- `POST /api/v1/payments/notification/` - Handle GoPay webhook notifications
- `GET /api/v1/payments/status/{order_id}/` - Check payment status

### Frontend (Angular)

**Files:**
- `frontend_angular/src/app/core/api/payment.service.ts` - Payment API service
- `frontend_angular/src/app/pages/checkout/checkout.component.ts` - Checkout with payment step
- `frontend_angular/src/app/pages/order-confirmation/order-confirmation.component.ts` - Payment result page

**Flow:**
1. Customer fills in shipping and contact information (Steps 1-2)
2. Customer selects GoPay as payment method (Step 3)
3. Customer reviews order (Step 4)
4. Customer submits order - backend creates order and GoPay payment
5. Customer is redirected to GoPay payment gateway
6. Customer completes payment on GoPay
7. Customer is redirected back to order confirmation page
8. GoPay sends webhook notification to backend
9. Backend updates order status to "paid"

## Configuration

### Environment Variables (.env)

Add these variables to `backend_django/.env`:

```env
# GoPay Configuration
GOPAY_CLIENT_ID=your_goid_here
GOPAY_CLIENT_SECRET=your_client_secret_here
GOPAY_ENVIRONMENT=test  # or 'production'
```

### Getting GoPay Credentials

1. **Test Environment (Sandbox):**
   - Register at https://www.gopay.com/
   - Create a test account
   - Get your GoID and Client Secret from the dashboard
   - Set `GOPAY_ENVIRONMENT=test`

2. **Production Environment:**
   - Contact GoPay to set up a merchant account
   - Get production credentials
   - Set `GOPAY_ENVIRONMENT=production`

## Payment States

GoPay uses these payment states:
- `CREATED` - Payment created, waiting for payment method
- `PAYMENT_METHOD_CHOSEN` - Customer selected payment method
- `PAID` - Payment successful
- `AUTHORIZED` - Payment authorized (captured later)
- `CANCELED` - Payment cancelled by customer
- `TIMEOUTED` - Payment timed out
- `REFUNDED` - Payment refunded
- `PARTIALLY_REFUNDED` - Partial refund

Our system maps these to:
- `pending` - CREATED, PAYMENT_METHOD_CHOSEN
- `completed` - PAID, AUTHORIZED
- `failed` - CANCELED, TIMEOUTED
- `refunded` - REFUNDED, PARTIALLY_REFUNDED

## Order Status Flow

1. Customer creates order → Order status: `created`
2. Customer is redirected to GoPay → Transaction status: `pending`
3. Customer completes payment → Transaction status: `completed`, Order status: `paid`
4. Admin ships order → Order status: `shipped`
5. Order delivered → Order status: `delivered`

## Testing

### Test Cards (Sandbox)

GoPay provides test cards for sandbox testing:

**Successful Payment:**
- Card: 4111111111111111
- Expiry: Any future date
- CVV: Any 3 digits

**Failed Payment:**
- Card: 4000000000000002
- Expiry: Any future date
- CVV: Any 3 digits

### Testing Webhook

To test webhook locally:
1. Use ngrok or similar tool to expose your local backend
2. Update GoPay dashboard with ngrok URL for notification URL
3. Or use GoPay testing tools to simulate webhook calls

## Security Considerations

1. **API Credentials:** Never commit `.env` file. Keep credentials secure.
2. **HTTPS:** Always use HTTPS in production for GoPay callbacks.
3. **Webhook Verification:** GoPay notifications should be verified (check payment status via API).
4. **Transaction Idempotency:** Multiple webhook calls for same transaction are handled safely.

## Troubleshooting

### Payment Not Created
- Check GoPay credentials in `.env`
- Verify API connectivity
- Check backend logs for error messages

### Payment Not Updating After GoPay
- Verify webhook URL is accessible from internet
- Check GoPay dashboard for webhook delivery status
- Check backend logs for webhook processing errors

### Customer Not Redirected Back
- Verify return URL is correctly configured
- Check frontend routing for `/order-confirmation`

## API Documentation

### Create Payment

**Request:**
```http
POST /api/v1/payments/create/
Authorization: Bearer <token>
Content-Type: application/json

{
  "order_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "payment_url": "https://gate.gopay.cz/...",
  "transaction_id": "3000000001",
  "transaction": {
    "id": 1,
    "order": 123,
    "amount": "99.99",
    "status": "pending",
    "provider": "gopay",
    "provider_transaction_id": "3000000001",
    "created_at": "2026-01-17T12:00:00",
    "updated_at": "2026-01-17T12:00:00"
  }
}
```

### Check Payment Status

**Request:**
```http
GET /api/v1/payments/status/123/
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": 1,
    "order": 123,
    "amount": "99.99",
    "status": "completed",
    "provider": "gopay",
    "provider_transaction_id": "3000000001",
    "created_at": "2026-01-17T12:00:00",
    "updated_at": "2026-01-17T12:05:00"
  },
  "order_status": "paid"
}
```

## Future Enhancements

- [ ] Support for recurring payments
- [ ] Support for payment splitting
- [ ] Support for refunds from admin panel
- [ ] Email notifications for payment status
- [ ] SMS notifications for payment confirmation
- [ ] Support for other payment providers (PayPal, Stripe, etc.)

## References

- GoPay API Documentation: https://doc.gopay.com/
- GoPay Merchant Portal: https://www.gopay.com/
- GoPay Support: support@gopay.com
