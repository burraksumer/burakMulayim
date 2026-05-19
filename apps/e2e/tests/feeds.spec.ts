import { test, expect } from "@playwright/test";

// RSS / JSON feed tests. Feeds are served by the API server (not the web
// app); in production, the public /feed.xml URL on the apex domain is
// expected to be reverse-proxied to the server. In the local test stack,
// we hit the server directly via API_BASE_URL.

const API_URL = process.env.API_BASE_URL ?? "http://localhost:3000";

test("GET /feed.xml returns 200 valid-looking XML", async ({ request }) => {
  const r = await request.get(`${API_URL}/feed.xml`);
  expect(r.status()).toBe(200);
  const body = await r.text();
  expect(body).toMatch(/<\?xml/);
  expect(body).toMatch(/<rss|<feed/i);
});

test("GET /feed.json returns 200 valid JSON Feed", async ({ request }) => {
  const r = await request.get(`${API_URL}/feed.json`);
  expect(r.status()).toBe(200);
  const body = (await r.json()) as { version: string; title: string; items: unknown[] };
  // JSON Feed v1 spec: https://jsonfeed.org/version/1.1
  expect(body.version).toMatch(/jsonfeed/);
  expect(body.title.length).toBeGreaterThan(0);
  expect(Array.isArray(body.items)).toBe(true);
});
