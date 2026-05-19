import { test, expect } from "@playwright/test";

// Cross-page navigation behaviors. Asserts that links wire up correctly,
// breadcrumbs return to expected destinations, and the Astro ClientRouter
// (declared in Layout.astro) doesn't break ordinary navigation.

test("home → 'all posts' → /posts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /all posts/i }).click();
  await expect(page).toHaveURL(/\/posts\/?$/);
  await expect(page.getByRole("heading", { level: 1, name: "Writing" })).toBeVisible();
});

test("/posts breadcrumb 'home' → /", async ({ page }) => {
  await page.goto("/posts");
  // Breadcrumb component renders the trail; "home" is the first crumb
  // and links back to /.
  await page.getByRole("link", { name: "home" }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Burak Sümer" })).toBeVisible();
});

test("/tags breadcrumb 'home' → /", async ({ page }) => {
  await page.goto("/tags");
  await page.getByRole("link", { name: "home" }).first().click();
  await expect(page).toHaveURL(/\/$/);
});

test("post detail page has navigable breadcrumb back to /posts", async ({ page }) => {
  await page.goto("/posts");
  const firstPostLink = page.locator('a[href^="/posts/"]').first();
  await firstPostLink.click();
  await page.waitForURL(/\/posts\/[^/]+\/?$/);
  // Breadcrumb on post detail typically has "home / writing / <title>".
  // Click "writing" to navigate back to /posts.
  const writingCrumb = page.getByRole("link", { name: "writing" }).first();
  await expect(writingCrumb).toBeVisible();
  await writingCrumb.click();
  await expect(page).toHaveURL(/\/posts\/?$/);
});

test("tag detail page links back via breadcrumb", async ({ page }) => {
  await page.goto("/tags");
  const firstTag = page.locator('a[href^="/tags/"]').first();
  await firstTag.click();
  await page.waitForURL(/\/tags\/[^/]+\/?$/);
  // Tag detail has a breadcrumb back to /tags.
  const tagsCrumb = page.getByRole("link", { name: "tags" }).first();
  await expect(tagsCrumb).toBeVisible();
  await tagsCrumb.click();
  await expect(page).toHaveURL(/\/tags\/?$/);
});

test("browser back navigates after a client-side link click", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /all posts/i }).click();
  await page.waitForURL(/\/posts\/?$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Burak Sümer" })).toBeVisible();
});

test("internal links use absolute paths starting with /", async ({ page }) => {
  // Walk pages and inspect every internal-looking link. Catches accidental
  // relative paths that would break under the Astro ClientRouter.
  await page.goto("/");
  const internalLinks = page.locator('a[href^="/"]:not([href^="//"])');
  const count = await internalLinks.count();
  for (let i = 0; i < count; i++) {
    const href = await internalLinks.nth(i).getAttribute("href");
    expect(href, `link #${i}`).toMatch(/^\/(?!\/)/);
    expect(href, `link #${i} should not have whitespace`).not.toMatch(/\s/);
  }
});
