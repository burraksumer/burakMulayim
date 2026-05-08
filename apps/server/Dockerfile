# syntax=docker/dockerfile:1.7

# ---- deps ----
# Install workspace dependencies once. Cached as long as lockfiles don't change.
FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/e2e/package.json apps/e2e/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/

RUN bun install --frozen-lockfile

# ---- runtime ----
FROM oven/bun:1.3.13-alpine AS runtime
WORKDIR /app

# Drop privileges. /data is the persistent-volume mount point for SQLite.
RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p /data \
  && chown app:app /data

# Whole tree from deps (root + per-workspace node_modules trees that bun creates).
COPY --from=deps --chown=app:app /app /app

# Overlay source. node_modules survive because the build context excludes them.
COPY --chown=app:app apps/server /app/apps/server
COPY --chown=app:app packages /app/packages

USER app
WORKDIR /app/apps/server

ENV NODE_ENV=production \
    DATABASE_URL=/data/local.db \
    POSTS_DIR=/app/apps/server/content/posts

EXPOSE 3000
# 127.0.0.1 (not localhost) — Alpine resolves AAAA first, but the listener binds IPv4 only.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=30s --start-interval=1s \
  CMD wget -q -O- http://127.0.0.1:3000/healthz || exit 1

CMD ["bun", "src/index.ts"]
