FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Unprivileged user the app actually runs as (see entrypoint.sh)
RUN useradd --create-home --shell /bin/bash appuser

# Copy and set entrypoint scripts
COPY entrypoint.sh /app/entrypoint.sh
COPY app-entrypoint.sh /app/app-entrypoint.sh
RUN chmod +x /app/entrypoint.sh /app/app-entrypoint.sh

EXPOSE 8000

# entrypoint.sh starts as root only to fix ownership of bind-mounted
# volumes, then drops to `appuser` for collectstatic/migrate/gunicorn.
ENTRYPOINT ["/app/entrypoint.sh"]
