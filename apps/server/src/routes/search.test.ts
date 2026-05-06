import { beforeEach, describe, expect, it } from "bun:test";
import { resolve } from "node:path";

import { createDb, type DbClient } from "@burakmulayim/db";
import { SearchResultSchema } from "@burakmulayim/shared";

import { loadPosts } from "../posts/loader";
import { PostStore } from "../posts/store";
import { searchRoutes } from "./search";

const FIXTURES = resolve(import.meta.dir, "../../test/fixtures/posts");

let db: DbClient;
let store: PostStore;

beforeEach(async () => {
  db = createDb();
  store = new PostStore(db);
  store.setAll(await loadPosts({ dir: FIXTURES }));
});

const handle = (path: string) =>
  searchRoutes({ store })
    .compile()
    .handle(new Request(`http://localhost${path}`));

describe("GET /search", () => {
  it("returns matching hits ranked by relevance", async () => {
    const res = await handle("/search?q=dragons");
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(SearchResultSchema.safeParse(json).success).toBe(true);
    expect(json.hits.length).toBeGreaterThan(0);
    expect(json.hits[0].slug).toBe("dragons-and-keyboards");
    expect(json.hits[0].snippet).toContain("<mark>");
  });

  it("returns empty hits for no matches", async () => {
    const res = await handle("/search?q=xyzzqzz");
    const json = (await res.json()) as any;
    expect(json.hits).toEqual([]);
  });

  it("returns empty hits for empty query", async () => {
    const res = await handle("/search?q=");
    const json = (await res.json()) as any;
    expect(json.hits).toEqual([]);
  });

  it("handles special characters without crashing", async () => {
    const res = await handle(`/search?q=${encodeURIComponent('"; DROP TABLE posts_fts; --')}`);
    expect(res.status).toBe(200);
  });

  it("respects limit", async () => {
    const res = await handle("/search?q=the&limit=1");
    const json = (await res.json()) as any;
    expect(json.hits.length).toBeLessThanOrEqual(1);
  });

  it("matches across title, body, and tags", async () => {
    const titleHit = (await (await handle("/search?q=Greetings")).json()) as {
      hits: { slug: string }[];
    };
    expect(titleHit.hits.some((h) => h.slug === "hello")).toBe(true);

    const tagHit = (await (await handle("/search?q=intro")).json()) as { hits: { slug: string }[] };
    expect(tagHit.hits.some((h) => h.slug === "hello")).toBe(true);
  });
});
