import { test, expect } from "@playwright/test";

// Direct API endpoint shape tests against the server. Web pages already
// exercise these via SSR; these tests verify the contract independently so
// schema drift surfaces as an API failure instead of a missing-data UI bug.
//
// The server URL is separate from BASE_URL because the web app is on a
// different host (or domain) than the API in deployed environments. Default
// matches the local docker-compose port mapping.

const API_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

test("GET /healthz returns 200 'ok' or JSON ok flag", async ({ request }) => {
  const r = await request.get(`${API_URL}/healthz`);
  expect(r.status()).toBe(200);
  // Server's /healthz currently returns JSON `{ ok: true }`; accept either
  // text 'ok' or JSON-with-ok-true so this test is resilient to either shape.
  const body = await r.text();
  expect(body === "ok" || body.includes('"ok"')).toBe(true);
});

test("GET /posts returns a non-empty array of post metadata", async ({ request }) => {
  const r = await request.get(`${API_URL}/posts`);
  expect(r.status()).toBe(200);
  const posts = (await r.json()) as Array<{ slug: string; title: string; date: string }>;
  expect(Array.isArray(posts)).toBe(true);
  expect(posts.length).toBeGreaterThan(0);
  for (const p of posts) {
    expect(p.slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    expect(p.title.length).toBeGreaterThan(0);
    expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}/);
  }
});

test("GET /posts/<slug> returns post detail when slug exists", async ({ request }) => {
  const list = await (await request.get(`${API_URL}/posts`)).json();
  const firstSlug = list[0].slug as string;
  const r = await request.get(`${API_URL}/posts/${firstSlug}`);
  expect(r.status()).toBe(200);
  const post = (await r.json()) as { slug: string; title: string; html?: string; body?: string };
  expect(post.slug).toBe(firstSlug);
  expect(post.title.length).toBeGreaterThan(0);
});

test("GET /posts/<bogus-slug> returns 404", async ({ request }) => {
  const r = await request.get(`${API_URL}/posts/this-slug-cannot-possibly-exist-xyz123`);
  expect(r.status()).toBe(404);
});

test("GET /tags returns array with {tag, slug, count} shape", async ({ request }) => {
  const r = await request.get(`${API_URL}/tags`);
  expect(r.status()).toBe(200);
  const tags = (await r.json()) as Array<{ tag: string; slug: string; count: number }>;
  expect(Array.isArray(tags)).toBe(true);
  expect(tags.length).toBeGreaterThan(0);
  for (const t of tags) {
    expect(t.tag.length).toBeGreaterThan(0);
    expect(t.slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    expect(t.count).toBeGreaterThan(0);
  }
});

test("GET /tags/<slug> returns tag detail with its posts", async ({ request }) => {
  const tags = await (await request.get(`${API_URL}/tags`)).json();
  const firstSlug = tags[0].slug as string;
  const r = await request.get(`${API_URL}/tags/${firstSlug}`);
  expect(r.status()).toBe(200);
  const detail = (await r.json()) as { tag: string; posts: unknown[] };
  expect(detail.tag.length).toBeGreaterThan(0);
  expect(Array.isArray(detail.posts)).toBe(true);
  expect(detail.posts.length).toBe(tags[0].count);
});

test("GET /lastfm returns user + tracks shape", async ({ request }) => {
  // The server's upstream_cache table absorbs Last.fm responses, and the
  // cache.get() path falls back to last-known-good on upstream failure. So a
  // non-200 from /lastfm means BOTH the live API is down AND we have no
  // cached fallback — which is a real bug in the cache layer or a hard
  // upstream outage worth surfacing.
  const r = await request.get(`${API_URL}/lastfm`);
  expect(r.status()).toBe(200);
  const body = (await r.json()) as {
    user: string;
    tracks: Array<{ name: string; artist: string }>;
  };
  expect(body.user.length).toBeGreaterThan(0);
  expect(Array.isArray(body.tracks)).toBe(true);
  for (const track of body.tracks) {
    expect(track.name.length).toBeGreaterThan(0);
    expect(track.artist.length).toBeGreaterThan(0);
  }
});

test("GET /carbon returns numeric gco2e and rating", async ({ request }) => {
  // Same cache-resilience expectation as /lastfm: non-200 means the cache
  // didn't catch a fallback, which is a real failure.
  const r = await request.get(`${API_URL}/carbon`);
  expect(r.status()).toBe(200);
  const body = (await r.json()) as { gco2e: number; rating: string; bytes: number };
  expect(typeof body.gco2e).toBe("number");
  expect(body.gco2e).toBeGreaterThanOrEqual(0);
  expect(body.rating.length).toBeGreaterThan(0);
  expect(body.bytes).toBeGreaterThan(0);
});

test("GET /now returns 200 with optional headline", async ({ request }) => {
  const r = await request.get(`${API_URL}/now`);
  // /now is allowed to be 200 with empty body or 404 if no /now content
  // is configured. Accept either; the assertion is just that the server
  // responds without 500.
  expect([200, 404]).toContain(r.status());
});
