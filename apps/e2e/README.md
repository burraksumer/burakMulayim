# e2e

Playwright end-to-end tests for the burak-mulayim monorepo.

Tests run against the full Docker Compose stack (web + server + db) brought up
locally, or against any URL via the `BASE_URL` env var.

## One-time setup

```sh
bun install
bun run --filter e2e playwright:install
```

## Authoring loop

```sh
bun run --filter e2e e2e:up      # boots stack, waits for healthchecks
bun run --filter e2e test:e2e    # runs tests; iterate
bunx playwright test --ui        # interactive debugging (run from apps/e2e)
bun run --filter e2e e2e:down    # tear down when done
```

## One-shot CI-style run

```sh
bun run --filter e2e test:e2e:local
```

## Targeting a different host (future CI / per-PR envs)

```sh
BASE_URL=https://pr-123.example.com bun run --filter e2e test:e2e
```

When `BASE_URL` is set, you do not need `e2e:up` — Playwright just hits the
URL you give it.
