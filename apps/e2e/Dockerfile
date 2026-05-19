# syntax=docker/dockerfile:1.7

# Single-stage Dockerfile for the e2e workspace. Diverges from web/server which
# use oven/bun:alpine, because Playwright needs glibc + a known set of system
# libraries that the official Playwright image already provides (chromium,
# fonts, codecs, etc.). The image tag must match @playwright/test in
# apps/e2e/package.json — bump both together.
FROM mcr.microsoft.com/playwright:v1.59.1-jammy

# Install bun so installs honor the workspace lockfile (bun.lock at the root).
# Symlinked into /usr/local/bin so CMD/RUN find it without a custom PATH.
RUN curl -fsSL https://bun.sh/install | bash \
  && ln -s /root/.bun/bin/bun /usr/local/bin/bun \
  && ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

WORKDIR /app

# Image already ships browsers; tell @playwright/test's install hook to skip
# downloading them again at `bun install` time.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install workspace dependencies once. This layer caches as long as no
# workspace package.json or the root lockfile changes. Mirrors the deps stage
# of apps/web/Dockerfile and apps/server/Dockerfile.
COPY package.json bun.lock ./
COPY apps/e2e/package.json apps/e2e/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/

RUN bun install --frozen-lockfile

# Overlay test source. node_modules survives because the build context ignores
# them (see .dockerignore).
COPY apps/e2e /app/apps/e2e
COPY packages/config /app/packages/config

WORKDIR /app/apps/e2e

CMD ["bunx", "playwright", "test"]
