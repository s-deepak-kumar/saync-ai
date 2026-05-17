# Saync deploy image — mirrors the IBM Cloud VSI runtime exactly.
#
# The base is Ubuntu 22.04 LTS so the install steps match DEPLOY.md §2
# byte-for-byte. If you change anything here, update DEPLOY.md to match.
#
# Build:   docker build -f deploy/Dockerfile -t saync .
# Run:     docker run -d --rm \
#            -p 8080:80 \
#            -e SAYNC_CORS_ORIGIN=http://localhost:8080 \
#            -v saync-data:/var/lib/saync \
#            --name saync saync
# Visit:   http://localhost:8080
# Logs:    docker logs -f saync

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PATH="/root/.bun/bin:$PATH"

# Runtime: bun + node + pnpm + nginx + curl/unzip for installers.
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl unzip ca-certificates git nginx \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && curl -fsSL https://bun.sh/install | bash \
  && npm install -g pnpm \
  && rm -rf /var/lib/apt/lists/*

# Copy source + install deps + build (cache-friendly layering).
WORKDIR /opt/saync
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY packages ./packages
COPY apps      ./apps

RUN pnpm install --frozen-lockfile

# Build the runtime packages.
RUN pnpm --filter @saync/core    build \
 && pnpm --filter @saync/backend build \
 && pnpm --filter @saync/react   build \
 && pnpm --filter @saync/agent   build

# Build the dashboard with an empty backend URL so api.ts emits
# same-origin paths like `/api/projects/...`. nginx forwards those
# to the backend on :4000. No CORS gymnastics.
#
# (`/api` would double-prefix, since lib/api.ts already prepends
# `/api/...` to every path it requests.)
RUN cd apps/dashboard \
 && NEXT_PUBLIC_SAYNC_BACKEND_URL="" pnpm build

# nginx config (replaces the default Ubuntu site).
COPY deploy/nginx.conf /etc/nginx/sites-enabled/default
RUN rm -f /etc/nginx/sites-enabled/000-default 2>/dev/null || true

# Entrypoint runs backend + dashboard + nginx (mirrors the three
# systemd units the real VSI would use).
COPY deploy/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Persistent volume mount point for SQLite.
VOLUME ["/var/lib/saync"]

EXPOSE 80
CMD ["/usr/local/bin/entrypoint.sh"]
