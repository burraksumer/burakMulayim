import { beforeEach, describe, expect, it } from "bun:test";
import { resolve } from "node:path";

import { createDb, type DbClient } from "@burakMulayim/db";

import { buildApp } from "./app";
import { loadPosts } from "./posts/loader";
import { PostStore } from "./posts/store";

const FIXTURES = resolve(import.meta.dir, "../test/fixtures/posts");

let db: DbClient;
let store: PostStore;

const SITE = {
  title: "t",
  description: "d",
  siteUrl: "https://burak.mulayim.app",
  feedUrl: "https://burak.mulayim.app/feed.xml",
  jsonFeedUrl: "https://burak.mulayim.app/feed.json",
};

beforeEach(async () => {
  db = createDb();
  store = new PostStore(db);
  store.setAll(await loadPosts({ dir: FIXTURES }));
});

const buildTestApp = (origin: string | string[]) =>
  buildApp({
    db,
    store,
    site: SITE,
    corsOrigin: origin,
    carbonTtlMs: 60_000,
    lastfmTtlMs: 60_000,
    carbonFetcher: async () => {
      throw new Error("not used");
    },
    lastfmFetcher: async () => {
      throw new Error("not used");
    },
  }).compile();

describe("CORS", () => {
  it("returns the configured origin on a preflight request", async () => {
    const app = buildTestApp("https://burak.mulayim.app");
    const res = await app.handle(
      new Request("http://localhost/posts", {
        method: "OPTIONS",
        headers: {
          Origin: "https://burak.mulayim.app",
          "Access-Control-Request-Method": "GET",
        },
      }),
    );
    expect(res.headers.get("access-control-allow-origin")).toBe("https://burak.mulayim.app");
  });
});

describe("/", () => {
  it("returns service info", async () => {
    const app = buildTestApp("*");
    const res = await app.handle(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
  });
});

describe("/healthz", () => {
  it("returns ok", async () => {
    const app = buildTestApp("*");
    const res = await app.handle(new Request("http://localhost/healthz"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).ok).toBe(true);
  });
});
