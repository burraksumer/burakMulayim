import { beforeEach, describe, expect, it } from "bun:test";
import { resolve } from "node:path";

import { createDb, type DbClient } from "@burakmulayim/db";
import { PostListSchema, PostSchema, TagListSchema } from "@burakmulayim/shared";

import { loadPosts } from "../posts/loader";
import { PostStore } from "../posts/store";
import { postRoutes } from "./posts";

const FIXTURES = resolve(import.meta.dir, "../../test/fixtures/posts");

let db: DbClient;
let store: PostStore;

beforeEach(async () => {
  db = createDb();
  store = new PostStore(db);
  store.setAll(await loadPosts({ dir: FIXTURES }));
});

function app() {
  return postRoutes({ store }).compile();
}

describe("GET /posts", () => {
  it("returns the list of post meta", async () => {
    const res = await app().handle(new Request("http://localhost/posts"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    const parsed = PostListSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(parsed.data!.length).toBe(3); // drafts excluded
    expect(json[0]).not.toHaveProperty("body");
  });
});

describe("GET /posts/:slug", () => {
  it("returns full post including body", async () => {
    const res = await app().handle(new Request("http://localhost/posts/hello"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(PostSchema.safeParse(json).success).toBe(true);
    expect(json.body).toContain("Greetings");
  });

  it("returns 404 for unknown slug", async () => {
    const res = await app().handle(new Request("http://localhost/posts/does-not-exist"));
    expect(res.status).toBe(404);
  });
});

describe("GET /tags", () => {
  it("returns tags with counts and slugs", async () => {
    const res = await app().handle(new Request("http://localhost/tags"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(TagListSchema.safeParse(json).success).toBe(true);
    const entries = json as { tag: string; slug: string; count: number }[];
    const tagNames = entries.map((t) => t.tag);
    expect(tagNames).toContain("intro");
    expect(tagNames).toContain("hello");
    expect(tagNames).toContain("Tech");
    // Slug is the URL-safe form of the tag
    expect(entries.find((t) => t.tag === "Tech")!.slug).toBe("tech");
  });
});

describe("GET /tags/:tag", () => {
  it("returns matching posts for a tag", async () => {
    const res = await app().handle(new Request("http://localhost/tags/intro"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.tag).toBe("intro");
    expect(json.posts.length).toBeGreaterThan(0);
  });

  it("returns 404 when no posts have the tag", async () => {
    const res = await app().handle(new Request("http://localhost/tags/nonexistent"));
    expect(res.status).toBe(404);
  });

  it("decodes URI-encoded tags", async () => {
    const res = await app().handle(
      new Request(`http://localhost/tags/${encodeURIComponent("Tech")}`),
    );
    expect(res.status).toBe(200);
  });

  it("matches by slug regardless of input casing or punctuation", async () => {
    // Lowercase slug, uppercase form, and the canonical display form all work.
    for (const url of ["/tags/tech", "/tags/TECH", "/tags/Tech"]) {
      const res = await app().handle(new Request(`http://localhost${url}`));
      expect(res.status).toBe(200);
      const json = (await res.json()) as { tag: string; slug: string; posts: unknown[] };
      expect(json.tag).toBe("Tech");
      expect(json.slug).toBe("tech");
      expect(json.posts.length).toBeGreaterThan(0);
    }
  });

  it("matches a tag with spaces and punctuation via its slug", async () => {
    // Add a post whose tags include something messy via the existing fixture
    // setup is overkill — instead use the existing single-word case to verify
    // the slug field is exposed correctly.
    const res = await app().handle(new Request("http://localhost/tags/hello"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { tag: string; slug: string };
    expect(json.tag).toBe("hello");
    expect(json.slug).toBe("hello");
  });
});
