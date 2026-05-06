import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

import type { DbClient } from "@burakmulayim/db";

import { Cache, type Fetcher } from "./cache";
import type { FeedSiteConfig } from "./feeds";
import { feedRoutes } from "./routes/feeds";
import { nowRoutes } from "./routes/now";
import { postRoutes } from "./routes/posts";
import { searchRoutes } from "./routes/search";
import { upstreamRoutes } from "./routes/upstream";
import type { PostStore } from "./posts/store";

export interface AppDeps {
  db: DbClient;
  store: PostStore;
  site: FeedSiteConfig;
  /** Directory holding markdown content (posts and now.md). */
  contentDir: string;
  corsOrigin: string | string[];
  carbonTtlMs: number;
  lastfmTtlMs: number;
  carbonFetcher: Fetcher<
    Parameters<typeof upstreamRoutes>[0]["carbonFetcher"] extends Fetcher<infer T> ? T : never
  >;
  lastfmFetcher: Fetcher<
    Parameters<typeof upstreamRoutes>[0]["lastfmFetcher"] extends Fetcher<infer T> ? T : never
  >;
}

export function buildApp(deps: AppDeps) {
  const cache = new Cache(deps.db);
  return new Elysia()
    .use(
      cors({
        origin: deps.corsOrigin,
        methods: ["GET", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Accept"],
        exposeHeaders: ["Content-Type"],
        credentials: false,
        maxAge: 86400,
      }),
    )
    .get("/", () => ({ ok: true, name: "burak.mulayim.app api" }))
    .get("/healthz", () => ({ ok: true }))
    .use(
      upstreamRoutes({
        cache,
        carbonTtlMs: deps.carbonTtlMs,
        lastfmTtlMs: deps.lastfmTtlMs,
        carbonFetcher: deps.carbonFetcher,
        lastfmFetcher: deps.lastfmFetcher,
      }),
    )
    .use(postRoutes({ store: deps.store }))
    .use(nowRoutes({ contentDir: deps.contentDir }))
    .use(feedRoutes({ store: deps.store, site: deps.site }))
    .use(searchRoutes({ store: deps.store }));
}
