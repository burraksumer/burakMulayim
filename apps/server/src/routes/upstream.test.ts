import { beforeEach, describe, expect, it } from "bun:test";

import { createDb, type DbClient } from "@burakmulayim/db";
import { CarbonSchema, LastfmResponseSchema } from "@burakmulayim/shared";

import { Cache } from "../cache";
import { upstreamRoutes } from "./upstream";

const carbonValue = {
  url: "https://burak.mulayim.app",
  green: true,
  bytes: 65536,
  adjusted_bytes: 49479.68,
  energy: 0.0000138,
  gco2e: 0.00557,
  cleanerThan: 0.95,
  rating: "A+",
  co2: {
    grid: { grams: 0.01, litres: 0.0001 },
    renewable: { grams: 0.005, litres: 0.00005 },
  },
};

const lastfmValue = {
  user: "burraksumer",
  tracks: [
    {
      name: "Song",
      artist: "Artist",
      album: "Album",
      url: "https://www.last.fm/music/Artist/_/Song",
      image: "https://lastfm.freetls.fastly.net/i/u/300x300/x.png",
      played_at: "2026-04-01T12:00:00.000Z",
      now_playing: false,
    },
  ],
};

let db: DbClient;
let cache: Cache;

beforeEach(() => {
  db = createDb();
  cache = new Cache(db);
});

function makeApp(
  overrides: Partial<{
    carbon: () => Promise<typeof carbonValue>;
    lastfm: () => Promise<typeof lastfmValue>;
    carbonTtlMs: number;
    lastfmTtlMs: number;
  }> = {},
) {
  return upstreamRoutes({
    cache,
    carbonTtlMs: overrides.carbonTtlMs ?? 60_000,
    lastfmTtlMs: overrides.lastfmTtlMs ?? 60_000,
    carbonFetcher: overrides.carbon ?? (async () => carbonValue),
    lastfmFetcher: overrides.lastfm ?? (async () => lastfmValue),
  }).compile();
}

describe("GET /carbon", () => {
  it("returns 200 with a Carbon-shape body on success", async () => {
    const app = makeApp();
    const res = await app.handle(new Request("http://localhost/carbon"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    const parsed = CarbonSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(parsed.data!.green).toBe(true);
    expect(parsed.data!.gco2e).toBeGreaterThan(0);
    expect(parsed.data!.adjusted_bytes).toBeGreaterThan(0);
    expect(parsed.data!.stale).toBe(false);
  });

  it("returns 503 when upstream fails and no prior success exists", async () => {
    const app = makeApp({
      carbon: async () => {
        throw new Error("boom");
      },
    });
    const res = await app.handle(new Request("http://localhost/carbon"));
    expect(res.status).toBe(503);
  });

  it("serves stale value with stale=true after upstream starts failing", async () => {
    let mode: "good" | "fail" = "good";
    const app = makeApp({
      carbonTtlMs: 1, // expire immediately to force re-fetch
      carbon: async () => {
        if (mode === "fail") throw new Error("503");
        return carbonValue;
      },
    });

    const ok = await app.handle(new Request("http://localhost/carbon"));
    expect(ok.status).toBe(200);

    mode = "fail";
    await new Promise((r) => setTimeout(r, 5)); // ensure TTL elapses
    const stale = await app.handle(new Request("http://localhost/carbon"));
    expect(stale.status).toBe(200);
    const body = (await stale.json()) as any;
    expect(body.stale).toBe(true);
    expect(body.last_success_at).toBeDefined();
  });
});

describe("GET /lastfm", () => {
  it("returns 200 with a LastfmResponse-shape body", async () => {
    const app = makeApp();
    const res = await app.handle(new Request("http://localhost/lastfm"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    const parsed = LastfmResponseSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(parsed.data!.tracks).toHaveLength(1);
  });

  it("returns 503 when upstream fails and no prior success exists", async () => {
    const app = makeApp({
      lastfm: async () => {
        throw new Error("503");
      },
    });
    const res = await app.handle(new Request("http://localhost/lastfm"));
    expect(res.status).toBe(503);
  });
});
