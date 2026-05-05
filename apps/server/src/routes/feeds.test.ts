import { beforeEach, describe, expect, it } from "bun:test";
import { resolve } from "node:path";

import { createDb, type DbClient } from "@burakMulayim/db";

import { loadPosts } from "../posts/loader";
import { PostStore } from "../posts/store";
import { feedRoutes } from "./feeds";

const FIXTURES = resolve(import.meta.dir, "../../test/fixtures/posts");

const SITE = {
  title: "Burak Sümer",
  description: "Personal blog",
  siteUrl: "https://burak.mulayim.app",
  feedUrl: "https://burak.mulayim.app/feed.xml",
  jsonFeedUrl: "https://burak.mulayim.app/feed.json",
  author: { name: "Burak Sümer" },
  language: "en",
};

let db: DbClient;
let store: PostStore;

beforeEach(async () => {
  db = createDb();
  store = new PostStore(db);
  store.setAll(await loadPosts({ dir: FIXTURES }));
});

function app() {
  return feedRoutes({ store, site: SITE }).compile();
}

describe("GET /feed.xml", () => {
  it("returns valid RSS XML with the right items", async () => {
    const res = await app().handle(new Request("http://localhost/feed.xml"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/rss+xml");
    const xml = await res.text();
    expect(xml).toStartWith("<?xml");

    // Parse back via Bun-compatible XML check: extract item titles
    const titles = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>/gu)].map((m) => m[1]);
    expect(titles.length).toBe(3);
    expect(titles).toContain("Hello World");
  });

  it("escapes special characters in titles", async () => {
    // Manual smoke: build directly then check escaping
    const res = await app().handle(new Request("http://localhost/feed.xml"));
    const xml = await res.text();
    expect(xml).not.toMatch(/<title>[^<]*[<>&"][^<]*<\/title>/u);
  });
});

describe("GET /feed.json", () => {
  it("conforms to JSON Feed v1.1", async () => {
    const res = await app().handle(new Request("http://localhost/feed.json"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.version).toBe("https://jsonfeed.org/version/1.1");
    expect(json.title).toBe(SITE.title);
    expect(json.feed_url).toBe(SITE.jsonFeedUrl);
    expect(Array.isArray(json.items)).toBe(true);
    expect(json.items.length).toBe(3);

    for (const item of json.items) {
      expect(item.id).toMatch(/^https:\/\//u);
      expect(item.url).toBe(item.id);
      expect(typeof item.title).toBe("string");
      expect(typeof item.content_text).toBe("string");
      expect(item.date_published).toMatch(/T\d{2}:\d{2}:\d{2}/u);
    }
  });
});

describe("GET /sitemap.xml", () => {
  it("returns a sitemap with one url per post plus the homepage", async () => {
    const res = await app().handle(new Request("http://localhost/sitemap.xml"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/gu)].map((m) => m[1]);
    expect(locs).toContain(SITE.siteUrl);
    expect(locs.some((l) => l!.endsWith("/posts/hello"))).toBe(true);
    expect(locs.length).toBe(4); // 1 home + 3 posts (drafts excluded)
  });
});
