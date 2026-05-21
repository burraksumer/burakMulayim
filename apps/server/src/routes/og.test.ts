import { beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

import { loadPosts } from "../posts/loader";
import { PostStore } from "../posts/store";
import { ogRoutes } from "./og";

const FIXTURES = resolve(import.meta.dir, "../../test/fixtures/posts");

let store: PostStore;
let cacheDir: string;

beforeEach(async () => {
  store = new PostStore();
  store.setAll(await loadPosts({ dir: FIXTURES }));
  // Hermetic tmp cache per test so disk-cache side effects don't leak
  // between cases.
  cacheDir = await mkdtemp(join(tmpdir(), "og-test-"));
});

function app() {
  return ogRoutes({ store, cacheDir }).compile();
}

describe("GET /og/:slug.png", () => {
  it("returns a PNG for the default slug", async () => {
    const res = await app().handle(new Request("http://localhost/og/default.png"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const buf = new Uint8Array(await res.arrayBuffer());
    // PNG magic number: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
    expect(buf.length).toBeGreaterThan(1000);

    // Verify long-cache header is set so browsers / Coolify proxy keep it.
    expect(res.headers.get("cache-control")).toContain("max-age");
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("returns a PNG for a known post slug", async () => {
    const res = await app().handle(new Request("http://localhost/og/hello.png"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(1000);
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("returns 404 for an unknown slug", async () => {
    const res = await app().handle(new Request("http://localhost/og/no-such-post.png"));
    expect(res.status).toBe(404);
    await rm(cacheDir, { recursive: true, force: true });
  });

  it("serves the cached PNG on second call (disk cache hit)", async () => {
    // First call renders + writes disk cache.
    const first = await app().handle(new Request("http://localhost/og/hello.png"));
    expect(first.status).toBe(200);
    const firstBytes = new Uint8Array(await first.arrayBuffer());

    // Second call should return the exact same bytes (read from cache).
    const second = await app().handle(new Request("http://localhost/og/hello.png"));
    expect(second.status).toBe(200);
    const secondBytes = new Uint8Array(await second.arrayBuffer());

    expect(secondBytes.length).toBe(firstBytes.length);
    await rm(cacheDir, { recursive: true, force: true });
  });
});
