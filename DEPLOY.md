# Deploying Saync

This guide covers deploying the Saync **backend + dashboard** to a single IBM Cloud VPC Virtual Server Instance (VSI). The architecture is intentionally simple: one machine, two long-lived processes, nginx in front, SQLite on a mounted volume.

If you're somewhere else (DigitalOcean, Hetzner, a bare VPS), the OS-level steps are identical — only the IBM Cloud console steps in §1 differ.

---

## What you'll end up with

```
                Public IP (port 80)
                       │
                ┌──────┴──────┐
                │    nginx    │
                └──┬───────┬──┘
              /api │       │ /  (and everything else)
                   ▼       ▼
        ┌─────────────┐ ┌──────────────────┐
        │  Backend    │ │  Dashboard       │
        │  Bun :4000  │ │  Next.js :3000   │
        └──────┬──────┘ └──────────────────┘
               │
        ┌──────▼──────────────────┐
        │  /var/lib/saync         │  ← persistent volume mount
        │   └── saync.db (SQLite) │
        └─────────────────────────┘
```

- Backend serves the REST API + SSE on `:4000` (proxied to `/api/*` by nginx).
- Dashboard serves the Next.js app on `:3000` (proxied to `/` by nginx).
- SQLite lives on a persistent block-storage volume so VSI restarts don't lose data.

---

## 1. Provision the VSI (IBM Cloud)

Console steps — substitute equivalents on your cloud of choice.

1. **IBM Cloud → VPC Infrastructure → Virtual server instances → Create.**
2. **Image**: Ubuntu 22.04 LTS x86_64.
3. **Profile**: `bx2-2x8` (2 vCPU, 8 GB RAM) is enough; `bx2-2x4` works for evaluation.
4. **SSH key**: upload yours (you'll need it to deploy).
5. **Network → Security group**: allow inbound `22` (SSH) and `80` (HTTP). Optionally `443` if you set up TLS.
6. **Storage → Add block storage volume**: 25 GB minimum, auto-mount at `/var/lib/saync`. (Or skip the extra volume — the boot disk is fine for evaluation.)
7. **Reserve a Floating IP** and bind it to the VSI. That's the public IP testers will visit.

SSH in:
```bash
ssh root@<floating-ip>
```

---

## 2. Install the runtime

```bash
# Bun (runs the backend)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Node.js 20 LTS (runs the dashboard)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# pnpm (workspace manager)
npm install -g pnpm

# nginx (reverse proxy)
apt-get install -y nginx

# git
apt-get install -y git
```

Verify:
```bash
bun --version    # 1.2+
node --version   # 20.x+
pnpm --version   # 9.x+
nginx -v
```

---

## 3. Pull the repo and build

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/your-org/saync-ai.git saync
cd saync
pnpm install
pnpm -r build

# Build the dashboard for production
cd apps/dashboard
NEXT_PUBLIC_SAYNC_BACKEND_URL="" pnpm build
cd ../..
```

Two things to note about that `NEXT_PUBLIC_SAYNC_BACKEND_URL`:

- It's **baked in at build time** (because it's `NEXT_PUBLIC_*`). If you change the host, rebuild.
- Setting it to `""` (empty) makes the dashboard's API client emit same-origin paths like `/api/projects/…`. nginx forwards those to the backend on `:4000`. No CORS gymnastics. (Don't set it to `/api` — `lib/api.ts` already prepends `/api/…` to every path, so you'd get a double prefix.)

---

## 4. Persist the SQLite database on the mounted volume

If you attached block storage in step 1:

```bash
mkdir -p /var/lib/saync
chown -R root:root /var/lib/saync
```

Otherwise the database lives on the boot disk — fine for evaluation, replace later.

Configure the backend to use that path:

```bash
cat > /etc/saync.env <<EOF
SAYNC_DB_PATH=/var/lib/saync/saync.db
SAYNC_CORS_ORIGIN=http://<floating-ip>
SAYNC_BACKEND_INTERNAL_URL=http://127.0.0.1:4000
EOF
```

Env vars read by the processes:
- `SAYNC_DB_PATH` (backend) — absolute path to the SQLite file
- `SAYNC_CORS_ORIGIN` (backend) — exact dashboard origin allowed by CORS
- `SAYNC_BACKEND_INTERNAL_URL` (dashboard) — how the Next.js process reaches the backend on the same VSI. Server-side fetches need an absolute URL; same-host loopback is fastest.

---

## 5. Run both processes as systemd units

Create `/etc/systemd/system/saync-backend.service`:

```ini
[Unit]
Description=Saync backend (Bun + Hono + SQLite)
After=network.target

[Service]
Type=simple
EnvironmentFile=/etc/saync.env
WorkingDirectory=/opt/saync
ExecStart=/root/.bun/bin/bun run packages/backend/src/index.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/saync-dashboard.service`:

```ini
[Unit]
Description=Saync dashboard (Next.js)
After=network.target

[Service]
Type=simple
EnvironmentFile=/etc/saync.env
WorkingDirectory=/opt/saync/apps/dashboard
ExecStart=/usr/bin/pnpm start
Restart=on-failure
RestartSec=5
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable + start:

```bash
systemctl daemon-reload
systemctl enable saync-backend saync-dashboard
systemctl start  saync-backend saync-dashboard
systemctl status saync-backend saync-dashboard
```

You should see both Active (running).

---

## 6. nginx reverse proxy

Replace `/etc/nginx/sites-enabled/default` with:

```nginx
server {
  listen 80 default_server;
  server_name _;

  # Backend API + SSE
  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # SSE — disable buffering so live events flow immediately.
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 24h;
  }

  # Backend health
  location = /health {
    proxy_pass http://127.0.0.1:4000/health;
  }

  # Everything else → Next.js dashboard
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        "upgrade";
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Reload:
```bash
nginx -t && systemctl reload nginx
```

---

## 7. Smoke test from your laptop

```bash
# Backend health (proxied through nginx)
curl http://<floating-ip>/health
# → {"status":"ok","version":"0.1.0"}

# Create a project
curl -X POST http://<floating-ip>/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke"}'
# → {"id":"…","name":"smoke","apiKey":"sync_…","createdAt":"…"}

# Visit the dashboard in a browser
open http://<floating-ip>/
# → landing page; create a project; the setup page shows install instructions
```

---

## 8. Point your own app at the deployed instance

In the project you want to verify:

```bash
SAYNC_BACKEND_URL=http://<floating-ip>/api \
SAYNC_API_KEY=sync_… \
pnpm exec saync-agent --project-id <id> http://localhost:3000
```

The agent will POST results to your deployed backend; open `http://<floating-ip>/p/<id>` to see them land.

---

## Operations

### Logs

```bash
journalctl -u saync-backend   -f
journalctl -u saync-dashboard -f
```

### Restart after pulling new code

```bash
cd /opt/saync
git pull
pnpm install
pnpm -r build
cd apps/dashboard
NEXT_PUBLIC_SAYNC_BACKEND_URL=http://<ip>/api pnpm build
cd ../..
systemctl restart saync-backend saync-dashboard
```

### Backup the database

The SQLite file is just `/var/lib/saync/saync.db`. Snapshot it with a daily cron:

```bash
echo '0 3 * * * cp /var/lib/saync/saync.db /var/lib/saync/saync.db.daily-$(date +\%w)' \
  >> /etc/crontab
```

Or use IBM Cloud's block-storage snapshots — quicker to restore.

### TLS (optional)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

Certbot rewrites the nginx config automatically. Update `SAYNC_CORS_ORIGIN` and `NEXT_PUBLIC_SAYNC_BACKEND_URL` accordingly, then rebuild the dashboard.

---

## Troubleshooting

**Dashboard returns 404 on every project URL.**
Stale `.next` cache after a route change. From `apps/dashboard`: `rm -rf .next && pnpm build && systemctl restart saync-dashboard`.

**Agent reports "Backend at … is not reachable."**
Confirm nginx is forwarding `/api/` to `:4000`. From the VSI: `curl http://localhost:4000/health` should return ok.

**`POST /api/runs` returns 401.**
The `SAYNC_API_KEY` env var doesn't match a project. Re-mint via `POST /api/projects` and update your CI secret.

**SSE stream disconnects after a few seconds.**
`proxy_buffering off` missing in your nginx config. nginx's default 60s read timeout also cuts SSE — that's why the recipe sets `proxy_read_timeout 24h`.

---

## Known limitations / TODOs before public traffic

| Item | What needs doing |
|---|---|
| Rate limiting | None today; a public instance should add `nginx` `limit_req` zones around `POST /api/projects` |
| Multi-tenant scale | Backend is single-process, single-SQLite. Scales to dozens of concurrent projects; for hundreds, migrate to Postgres (Drizzle already supports it) |
| API key rotation | Not implemented — to rotate, create a new project and re-point the agent |
| Project deletion | No endpoint yet. To remove a project: `sqlite3 /var/lib/saync/saync.db "DELETE FROM projects WHERE id='…'"` (cascade deletes runs, results, issues) |
