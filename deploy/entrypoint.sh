#!/bin/bash
# Container entrypoint — starts backend, dashboard, and nginx.
#
# In production this would be three systemd units (see DEPLOY.md §5).
# Inside a container we just run them in parallel and tail logs. If any
# of them dies the container exits (we want loud failure, not zombie).

set -e

LOG_DIR=/var/log/saync
mkdir -p "$LOG_DIR" /var/lib/saync

export SAYNC_DB_PATH="${SAYNC_DB_PATH:-/var/lib/saync/saync.db}"
export SAYNC_PORT="${SAYNC_PORT:-4000}"
# Dashboard's Node process talks to the backend in-container; same VSI,
# same loopback. Client browsers go same-origin via nginx.
export SAYNC_BACKEND_INTERNAL_URL="${SAYNC_BACKEND_INTERNAL_URL:-http://127.0.0.1:$SAYNC_PORT}"

cd /opt/saync

# Backend
echo "[entrypoint] starting saync-backend → :$SAYNC_PORT, db=$SAYNC_DB_PATH"
bun run packages/backend/src/index.ts > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Wait for the backend's /health to come up before the dashboard.
# Otherwise the dashboard's server-component fetches at boot will hit
# a closed port and Next.js will rage-quit.
for i in $(seq 1 30); do
  if curl -fs http://127.0.0.1:$SAYNC_PORT/health >/dev/null 2>&1; then
    echo "[entrypoint] backend is up"
    break
  fi
  sleep 0.5
done

# Dashboard
echo "[entrypoint] starting saync-dashboard → :3000"
cd /opt/saync/apps/dashboard
PORT=3000 pnpm start > "$LOG_DIR/dashboard.log" 2>&1 &
DASHBOARD_PID=$!
cd /opt/saync

# nginx in the foreground — its exit is what stops the container.
echo "[entrypoint] starting nginx → :80"
# If any backend / dashboard process dies, kill nginx so the
# container exits and the orchestrator restarts us.
( wait $BACKEND_PID; echo "[entrypoint] backend exited"; kill -TERM 1 ) &
( wait $DASHBOARD_PID; echo "[entrypoint] dashboard exited"; kill -TERM 1 ) &

# Tee logs to stdout so `docker logs` shows everything live.
tail -F "$LOG_DIR/backend.log" "$LOG_DIR/dashboard.log" &

exec nginx -g 'daemon off;'
