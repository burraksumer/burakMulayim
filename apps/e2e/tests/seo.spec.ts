import { test, expect } from "@playwright/test";

// Crawler / discoverability surfaces served by the web app on the apex
// domain. These are concerns that cut across every page (canonical, feed
// autodiscovery) plus a couple of well-known root paths (robots.txt,
// sitemap.xml). Kept in their own file so they don't get lost inside the
// per-page specs.

test("/robots.txt returns 200 and points at the sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/User-agent:\s*\*/i);
  expect(body).toMatch(/Sitemap:\s*https:\/\/.+\/sitemap\.xml/);
});

test("/sitemap.xml on the apex proxies the API and returns XML", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/xml/);
  const body = await res.text();
  expect(body).toMatch(/<\?xml/);
  expect(body).toMatch(/<urlset|<sitemapindex/);
});

test("/feed.xml on the apex proxies the API and returns RSS", async ({ request }) => {
  const res = await request.get("/feed.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/rss\+xml/);
  const body = await res.text();
  expect(body).toMatch(/<\?xml/);
  expect(body).toMatch(/<rss|<feed/i);
});

test("/feed.json on the apex proxies the API and returns JSON Feed", async ({ request }) => {
  const res = await request.get("/feed.json");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/feed\+json/);
  const body = (await res.json()) as { version: string; title: string; items: unknown[] };
  expect(body.version).toMatch(/jsonfeed/);
  expect(body.title.length).toBeGreaterThan(0);
  expect(Array.isArray(body.items)).toBe(true);
});

test("/og/default.png on the apex proxies the API and returns a PNG", async ({ request }) => {
  const res = await request.get("/og/default.png");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  const buf = await res.body();
  // PNG magic number — first four bytes are 89 50 4E 47.
  expect(buf[0]).toBe(0x89);
  expect(buf[1]).toBe(0x50);
  expect(buf[2]).toBe(0x4e);
  expect(buf[3]).toBe(0x47);
  expect(buf.byteLength).toBeGreaterThan(1000);
});

test("every page has a canonical link in <head>", async ({ page }) => {
  // Sample a few representative routes; the link is rendered by Layout.astro
  // so testing any one page proves the layer, but spot-checking a couple
  // catches accidental Layout-bypass regressions.
  for (const path of ["/", "/about", "/posts"]) {
    await page.goto(path);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const href = await canonical.getAttribute("href");
    expect(href).toMatch(/^https:\/\/.+/);
    expect(href).toContain(path === "/" ? "/" : path);
  }
});

test("every page advertises RSS and JSON feeds via <link rel=alternate>", async ({ page }) => {
  await page.goto("/");
  const rss = page.locator('link[rel="alternate"][type="application/rss+xml"]');
  const jsonFeed = page.locator('link[rel="alternate"][type="application/feed+json"]');
  await expect(rss).toHaveCount(1);
  await expect(jsonFeed).toHaveCount(1);
  expect(await rss.getAttribute("href")).toMatch(/\/feed\.xml$/);
  expect(await jsonFeed.getAttribute("href")).toMatch(/\/feed\.json$/);
});

test("every page sets theme-color meta to the ink background", async ({ page }) => {
  await page.goto("/");
  // Single source of truth lives in Layout.astro; if this drifts, mobile
  // browser chrome stops matching the page surface.
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(themeColor).toHaveAttribute("content", "#0c0b0a");
});

test("404 page sets robots noindex; normal pages do not", async ({ page }) => {
  // /404 is technically crawlable; we don't want it indexed as a "Not found"
  // search result.
  await page.goto("/this-page-does-not-exist");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");

  // Inverse: a normal page must NOT emit the noindex (otherwise we'd hide
  // everything from search by accident).
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("post pages emit a BlogPosting JSON-LD block", async ({ page }) => {
  // Pick any post in the fixtures; switch-to-astro is one we already use in
  // other specs so it's known-present.
  await page.goto("/posts/switch-to-astro");
  const script = page.locator('script[type="application/ld+json"]');
  await expect(script).toHaveCount(1);

  const raw = await script.textContent();
  expect(raw).not.toBeNull();
  // Must be parseable; an unparseable block is invisible to crawlers AND a
  // Google Search Console warning waiting to happen.
  const parsed = JSON.parse(raw!) as {
    "@context": string;
    "@type": string;
    headline: string;
    url: string;
  };
  expect(parsed["@context"]).toBe("https://schema.org");
  expect(parsed["@type"]).toBe("BlogPosting");
  expect(parsed.headline.length).toBeGreaterThan(0);
  expect(parsed.url).toContain("/posts/switch-to-astro");
});

test("non-post pages do not emit a JSON-LD script", async ({ page }) => {
  // BlogPosting JSON-LD is article-specific; emitting it on index/about/etc.
  // is wrong and would confuse Google about page intent.
  for (const path of ["/", "/about", "/posts"]) {
    await page.goto(path);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }
});
