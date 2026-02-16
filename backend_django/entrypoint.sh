#!/bin/bash

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 8 --threads 2 --timeout 120 --max-requests 1000 --max-requests-jitter 50 wake_tf_up.wsgi:application
