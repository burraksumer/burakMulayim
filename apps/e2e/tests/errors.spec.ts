import { test, expect } from "@playwright/test";

// Error-path behaviors: random URLs, malformed slugs, and missing detail
// resources should all yield clean 404s — not 500s, not blank screens.

test("random URL returns 404", async ({ page }) => {
  const r = await page.goto("/this-page-cannot-possibly-exist-asdfasdf");
  expect(r?.status()).toBe(404);
});

test("non-existent post slug returns 404", async ({ page }) => {
  const r = await page.goto("/posts/this-slug-does-not-exist-zzz");
  expect(r?.status()).toBe(404);
});

test("non-existent tag slug returns 404", async ({ page }) => {
  const r = await page.goto("/tags/this-tag-does-not-exist-zzz");
  expect(r?.status()).toBe(404);
});

test("404 page renders something — not an empty body", async ({ page }) => {
  await page.goto("/genuinely-not-a-page");
  // 404 page renders 404.astro which has body content. Footer should still
  // render (Layout.astro). Body should not be empty.
  const bodyText = await page.locator("body").innerText();
  expect(bodyText.length).toBeGreaterThan(0);
  await expect(page.locator("footer")).toBeVisible();
});
