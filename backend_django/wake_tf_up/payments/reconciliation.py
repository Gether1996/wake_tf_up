import logging
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction as db_transaction

from .models import PaymentTransaction


logger = logging.getLogger(__name__)


def apply_gopay_status_to_transaction(transaction, status_result, source='GoPay'):
    """
    Apply a GoPay status payload to a local PaymentTransaction and its order.

    Returns the normalized state string.
    """
    state = status_result.get('state')
    provider_response = status_result.get('data')

    if state == 'PAID':
        was_already_paid = transaction.order.status == 'paid'
        with db_transaction.atomic():
            transaction.status = 'completed'
            transaction.order.status = 'paid'
            transaction.order.save(update_fields=['status'])
            transaction.provider_response = provider_response
            transaction.save(update_fields=['status', 'provider_response'])

        if not was_already_paid:
            try:
                from orders.emails import send_payment_confirmation_email

                logger.info(
                    "[%s] Sending payment confirmation email for order #%s in %s",
                    source,
                    transaction.order.id,
                    transaction.order.language,
                )
                send_payment_confirmation_email(transaction.order)
            except Exception as email_exc:
                logger.error(
                    "[%s] Failed to send payment confirmation email for order #%s: %s",
                    source,
                    transaction.order.id,
                    email_exc,
                    exc_info=True,
                )
        return state

    if state in ['CANCELED', 'TIMEOUTED']:
        transaction.status = 'failed'
        transaction.provider_response = provider_response
        transaction.save(update_fields=['status', 'provider_response'])
        return state

    if state == 'REFUNDED':
        with db_transaction.atomic():
            transaction.status = 'refunded'
            transaction.order.status = 'refunded'
            transaction.order.save(update_fields=['status'])
            transaction.provider_response = provider_response
            transaction.save(update_fields=['status', 'provider_response'])
        return state

    transaction.provider_response = provider_response
    transaction.save(update_fields=['provider_response'])
    return state


def reconcile_pending_gopay_transactions(*, older_than_minutes=5, limit=50, source='Payment Reconcile'):
    """
    Reconcile stale pending GoPay transactions against the provider API.
    """
    if getattr(settings, 'GOPAY_DISABLE_PAYMENTS', False):
        logger.info("[%s] Skipping reconciliation because GoPay payments are disabled", source)
        return {
            'checked': 0,
            'updated': 0,
            'paid': 0,
            'failed': 0,
            'refunded': 0,
            'errors': 0,
        }

    cutoff = datetime.now() - timedelta(minutes=older_than_minutes)
    transactions = list(
        PaymentTransaction.objects.select_related('order')
        .filter(
            provider='gopay',
            status='pending',
            created_at__lte=cutoff,
        )
        .exclude(provider_transaction_id='')
        .order_by('created_at')[:limit]
    )

    if not transactions:
        logger.info("[%s] No pending GoPay transactions eligible for reconciliation", source)
        return {
            'checked': 0,
            'updated': 0,
            'paid': 0,
            'failed': 0,
            'refunded': 0,
            'errors': 0,
        }

    from .gopay_service import GoPayService

    gopay = GoPayService()
    summary = {
        'checked': 0,
        'updated': 0,
        'paid': 0,
        'failed': 0,
        'refunded': 0,
        'errors': 0,
    }

    for transaction in transactions:
        summary['checked'] += 1
        try:
            status_result = gopay.check_payment_status(transaction.provider_transaction_id)
        except Exception as exc:
            logger.error(
                "[%s] Exception while checking GoPay transaction %s: %s",
                source,
                transaction.provider_transaction_id,
                exc,
                exc_info=True,
            )
            summary['errors'] += 1
            continue

        if not status_result.get('success'):
            logger.warning(
                "[%s] Failed to fetch GoPay status for transaction %s: %s",
                source,
                transaction.provider_transaction_id,
                status_result.get('error'),
            )
            summary['errors'] += 1
            continue

        state = apply_gopay_status_to_transaction(transaction, status_result, source=source)
        if state == 'PAID':
            summary['updated'] += 1
            summary['paid'] += 1
        elif state in ['CANCELED', 'TIMEOUTED']:
            summary['updated'] += 1
            summary['failed'] += 1
        elif state == 'REFUNDED':
            summary['updated'] += 1
            summary['refunded'] += 1

    logger.info(
        "[%s] Reconciliation finished: checked=%s updated=%s paid=%s failed=%s refunded=%s errors=%s",
        source,
        summary['checked'],
        summary['updated'],
        summary['paid'],
        summary['failed'],
        summary['refunded'],
        summary['errors'],
    )
    return summary
