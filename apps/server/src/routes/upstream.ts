import { Elysia } from "elysia";

import type { Cache, Fetcher } from "../cache";

export interface UpstreamRouteDeps {
  cache: Cache;
  carbonTtlMs: number;
  lastfmTtlMs: number;
  carbonFetcher: Fetcher<{
    url: string;
    green: boolean;
    bytes: number;
    adjusted_bytes: number;
    energy: number;
    gco2e: number;
    cleanerThan: number;
    rating: string;
    co2: {
      grid: { grams: number; litres: number };
      renewable: { grams: number; litres: number };
    };
  }>;
  lastfmFetcher: Fetcher<{
    user: string;
    tracks: Array<Record<string, unknown>>;
  }>;
}

export function upstreamRoutes(deps: UpstreamRouteDeps) {
  return new Elysia()
    .get("/carbon", async ({ status }) => {
      const entry = await deps.cache.get({
        key: "carbon",
        ttlMs: deps.carbonTtlMs,
        fetcher: deps.carbonFetcher,
      });
      if (!entry) return status(503, { error: "upstream unavailable" });
      return {
        ...entry.value,
        fetched_at: entry.fetched_at.toISOString(),
        last_success_at: entry.last_success_at.toISOString(),
        last_changed_at: entry.last_changed_at.toISOString(),
        stale: entry.stale,
      };
    })
    .get("/lastfm", async ({ status }) => {
      const entry = await deps.cache.get({
        key: "lastfm",
        ttlMs: deps.lastfmTtlMs,
        fetcher: deps.lastfmFetcher,
      });
      if (!entry) return status(503, { error: "upstream unavailable" });
      return {
        ...entry.value,
        fetched_at: entry.fetched_at.toISOString(),
        last_success_at: entry.last_success_at.toISOString(),
        stale: entry.stale,
      };
    });
}
