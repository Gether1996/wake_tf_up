#!/bin/bash
set -euo pipefail

# Runs as root only to fix ownership of bind-mounted volumes (media/
# staticfiles/logs are host directories in production and may be owned by
# root or an arbitrary host UID). Everything else runs as the unprivileged
# `appuser` via app-entrypoint.sh.
mkdir -p /app/logs /app/wake_tf_up/media /app/wake_tf_up/staticfiles
chown -R appuser:appuser /app/logs /app/wake_tf_up/media /app/wake_tf_up/staticfiles

exec su appuser -s /bin/bash -c /app/app-entrypoint.sh
