#!/bin/bash
set -euo pipefail

cd /app/wake_tf_up

echo "Waiting for database..."
python - <<'PY'
import os
import sys
import time

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wake_tf_up.settings')
django.setup()

from django.db import connection

deadline = time.time() + 60
while True:
    try:
        connection.ensure_connection()
        break
    except Exception as exc:
        if time.time() > deadline:
            print(f"Database not reachable after 60s: {exc}", file=sys.stderr)
            sys.exit(1)
        print("Database not ready yet, retrying...")
        time.sleep(2)
PY

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting pending payment reconciliation loop..."
(
  # Don't let set -e from the parent shell kill this loop on a single failed
  # iteration — log the failure and keep retrying instead.
  set +e
  while true; do
    if ! python manage.py reconcile_pending_payments --older-than-minutes=2 --limit=50; then
      echo "[reconcile_pending_payments] iteration failed, retrying after backoff" >&2
    fi
    sleep 120
  done
) &

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 8 --threads 2 --timeout 120 --max-requests 1000 --max-requests-jitter 50 wake_tf_up.wsgi:application
