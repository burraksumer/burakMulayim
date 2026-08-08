# e2e

Playwright end-to-end tests for the burak-mulayim monorepo.

Tests target whatever's listening at `BASE_URL` (defaults to
`http://localhost:4321`). Two execution paths:

1. **Local dev loop** — run the stack however you usually do (`bun run dev`
   from the repo root) and point Playwright at it. Fast iteration, real
   logs, native debugger.
2. **Containerized one-shot** — `docker compose --profile test run --rm e2e`
   spins up `web` + `server` and runs the tests inside the Docker network.
   Closest thing to "prod-like" without leaving the local machine.

## One-time setup

```sh
bun install
bun run --filter e2e playwright:install   # only needed for paths (1) and UI mode
```

## Authoring loop (host-side)

```sh
bun run dev                             # in one terminal: start web + server
bun run --filter e2e test:e2e:ui        # in another: interactive Playwright UI
# or:
bun run --filter e2e test:e2e           # headless run
```

## Containerized one-shot

```sh
bun run --filter e2e test:e2e:docker
```

Runs Playwright inside a Microsoft Playwright container on the same Docker
network as `web`/`server`. No host ports or browsers needed.

## Targeting a different host

```sh
BASE_URL=https://pr-123.example.com bun run --filter e2e test:e2e
```

When `BASE_URL` is set, Playwright just hits the URL you give it — no stack
boot involved.
