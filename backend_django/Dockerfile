FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Change to Django project directory
WORKDIR /app/wake_tf_up

EXPOSE 8000

# Run with Gunicorn (production-ready)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "wake_tf_up.wsgi:application"]
