# syntax=docker/dockerfile:1.7

# ---- deps ----
# Install workspace dependencies once. Cached as long as lockfiles don't change.
FROM oven/bun:1.3.13-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/

RUN bun install --frozen-lockfile

# ---- build ----
# Run `astro build`; produces apps/web/dist/ (server entry + static client assets).
FROM oven/bun:1.3.13-alpine AS build
WORKDIR /app

# Whole tree from deps so per-workspace node_modules (incl. apps/web/.bin/astro) exist.
COPY --from=deps /app /app
COPY apps/web /app/apps/web
COPY packages /app/packages

WORKDIR /app/apps/web
RUN bun run build

# ---- runtime ----
# Minimal image that runs Astro's standalone server on Bun.
FROM oven/bun:1.3.13-alpine AS runtime
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

# Bring deps + the built artifacts.
COPY --from=deps  --chown=app:app /app /app
COPY --from=build --chown=app:app /app/apps/web/dist /app/apps/web/dist

USER app
WORKDIR /app/apps/web

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=3s --retries=3 --start-period=30s --start-interval=1s \
  CMD wget -q -O- http://localhost:4321/ > /dev/null || exit 1

CMD ["bun", "./dist/server/entry.mjs"]
