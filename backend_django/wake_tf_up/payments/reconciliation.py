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
    logger.info(
        "[%s] Applying GoPay state=%s to transaction #%s (provider_id=%s, tx_status=%s, order_id=%s, order_status=%s)",
        source,
        state,
        transaction.id,
        transaction.provider_transaction_id,
        transaction.status,
        transaction.order_id,
        transaction.order.status,
    )

    if state == 'PAID':
        # Defensive sanity check: the amount is set by our own server when
        # creating the GoPay session, so a mismatch here shouldn't be
        # reachable via customer action — but if it ever happens (stale
        # order total, a bug in create_payment, manual GoPay dashboard
        # tinkering), don't silently auto-fulfil for the wrong amount.
        expected_amount_cents = int(transaction.amount * 100)
        actual_amount_cents = status_result.get('amount')
        if actual_amount_cents is not None and actual_amount_cents != expected_amount_cents:
            logger.error(
                "[%s] Amount mismatch for transaction #%s (order #%s): expected %s cents, "
                "GoPay reports %s cents paid. Refusing to auto-mark as paid — needs manual review.",
                source,
                transaction.id,
                transaction.order_id,
                expected_amount_cents,
                actual_amount_cents,
            )
            transaction.provider_response = provider_response
            transaction.save(update_fields=['provider_response'])
            return state

        was_already_paid = transaction.order.status == 'paid'
        if was_already_paid and transaction.status == 'completed':
            if transaction.provider_response != provider_response:
                transaction.provider_response = provider_response
                transaction.save(update_fields=['provider_response'])
            logger.info(
                "[%s] Transaction #%s already finalized as completed for paid order #%s",
                source,
                transaction.id,
                transaction.order_id,
            )
            return state

        with db_transaction.atomic():
            # Lock the order row and re-check status inside the transaction.
            # GoPay can deliver the same webhook more than once, and the
            # reconciliation loop can overlap with a live webhook for the
            # same transaction — without this lock both callers can read
            # was_already_paid=False above and both apply the "first paid"
            # side effects (order update, confirmation email).
            order = transaction.order.__class__.objects.select_for_update().get(
                pk=transaction.order_id
            )
            transaction.refresh_from_db(fields=['status'])
            was_already_paid = order.status == 'paid'

            if was_already_paid and transaction.status == 'completed':
                if transaction.provider_response != provider_response:
                    transaction.provider_response = provider_response
                    transaction.save(update_fields=['provider_response'])
                logger.info(
                    "[%s] Transaction #%s already finalized as completed for paid order #%s (race avoided)",
                    source,
                    transaction.id,
                    transaction.order_id,
                )
                return state

            transaction.status = 'completed'
            transaction.provider_response = provider_response
            transaction.save(update_fields=['status', 'provider_response'])
            transaction.order = order
            if not was_already_paid:
                order.status = 'paid'
                order.save(update_fields=['status'])
                order.mark_paid_discount_usage()

                def _send_confirmation_email():
                    try:
                        from orders.emails import send_payment_confirmation_email

                        logger.info(
                            "[%s] Sending payment confirmation email for order #%s in %s",
                            source,
                            order.id,
                            order.language,
                        )
                        send_payment_confirmation_email(order)
                    except Exception as email_exc:
                        logger.error(
                            "[%s] Failed to send payment confirmation email for order #%s: %s",
                            source,
                            order.id,
                            email_exc,
                            exc_info=True,
                        )

                db_transaction.on_commit(_send_confirmation_email)

        logger.info(
            "[%s] Finalized transaction #%s as completed and order #%s as %s",
            source,
            transaction.id,
            transaction.order_id,
            transaction.order.status,
        )
        return state

    if state in ['CANCELED', 'TIMEOUTED']:
        transaction.status = 'failed'
        transaction.provider_response = provider_response
        transaction.save(update_fields=['status', 'provider_response'])
        logger.warning(
            "[%s] Marked transaction #%s as failed due to GoPay state=%s",
            source,
            transaction.id,
            state,
        )
        return state

    if state == 'REFUNDED':
        with db_transaction.atomic():
            transaction.status = 'refunded'
            transaction.provider_response = provider_response
            transaction.save(update_fields=['status', 'provider_response'])
            if transaction.order.status != 'refunded':
                transaction.order.status = 'refunded'
                transaction.order.save(update_fields=['status'])
        logger.info(
            "[%s] Marked transaction #%s and order #%s as refunded",
            source,
            transaction.id,
            transaction.order_id,
        )
        return state

    transaction.provider_response = provider_response
    transaction.save(update_fields=['provider_response'])
    logger.info(
        "[%s] Stored provider response for transaction #%s without local status change",
        source,
        transaction.id,
    )
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
        logger.debug("[%s] No pending GoPay transactions eligible for reconciliation", source)
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
