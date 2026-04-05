#!/bin/bash

mkdir -p /app/logs

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting pending payment reconciliation loop..."
(
  while true; do
    python manage.py reconcile_pending_payments --older-than-minutes=2 --limit=50
    sleep 120
  done
) &

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 8 --threads 2 --timeout 120 --max-requests 1000 --max-requests-jitter 50 wake_tf_up.wsgi:application
