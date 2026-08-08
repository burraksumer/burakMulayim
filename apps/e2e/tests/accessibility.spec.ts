import { test, expect } from "@playwright/test";

// Accessibility surfaces that apply site-wide (rendered in Layout.astro or
// components used everywhere). Per-page a11y assertions stay in their own
// page specs; this file holds the cross-cutting ones.

test("every page has a skip-to-content link pointing at #main", async ({ page }) => {
  // Layout.astro emits the skip link, so any route is a fair sample.
  for (const path of ["/", "/posts", "/about"]) {
    await page.goto(path);
    const skipLink = page.getByRole("link", { name: /skip to content/i });
    await expect(skipLink).toHaveAttribute("href", "#main");
    // Target exists — the link wouldn't help if #main weren't on the page.
    await expect(page.locator("#main")).toHaveCount(1);
  }
});

test("skip link is the first focusable element on the page", async ({ page }) => {
  await page.goto("/");
  // Tab once from the body should land on the skip link. If anything else
  // is tab-focusable before it (a nav, a header link, etc.) this fails.
  await page.keyboard.press("Tab");
  // Playwright's `:focus` pseudo-class targets the currently-focused element
  // — avoids reaching for `document` in the test runner's Node context.
  await expect(page.locator(":focus")).toHaveText("Skip to content");
});
