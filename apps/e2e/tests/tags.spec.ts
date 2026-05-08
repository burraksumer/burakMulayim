import { test, expect } from "@playwright/test";

test("tag links on /tags resolve to /tags/<non-empty-slug>", async ({ page }) => {
  const response = await page.goto("/tags");
  expect(response?.status()).toBe(200);

  const tagLinks = page.locator('a[href^="/tags/"]');
  const count = await tagLinks.count();
  expect(count).toBeGreaterThan(0);

  // Inspect every tag link on the page; none may point at /tags/undefined or
  // an empty slug. Pattern: lowercase letters, digits, and hyphens.
  const slugRe = /^\/tags\/[a-z0-9][a-z0-9-]*$/;
  for (let i = 0; i < count; i++) {
    const href = await tagLinks.nth(i).getAttribute("href");
    expect(href, `tag link #${i} href`).not.toBe("/tags/undefined");
    expect(href, `tag link #${i} href`).toMatch(slugRe);
  }
});

test("clicking a tag from /tags navigates to a tag page that returns 200", async ({ page }) => {
  await page.goto("/tags");
  const firstTag = page.locator('a[href^="/tags/"]').first();
  await expect(firstTag).toBeVisible();
  const href = await firstTag.getAttribute("href");
  expect(href).toMatch(/^\/tags\/[a-z0-9][a-z0-9-]*$/);

  await firstTag.click();
  await expect(page).toHaveURL(new RegExp(`${href}/?$`));
  // Tag detail page should render — at minimum, the <h1> from PageHeader.
  await expect(page.locator("h1")).toBeVisible();
});

test("tag links rendered via TagList on a post detail page also have valid slugs", async ({
  page,
}) => {
  // Walk to the first post; its detail page renders TagList (the component
  // that previously had the duplicated slugify implementation).
  await page.goto("/posts");
  const firstPostLink = page.locator('a[href^="/posts/"]').first();
  await firstPostLink.click();
  await page.waitForURL(/\/posts\/[^/]+\/?$/);

  // If this post has no tags, skip — the test is conditional on tag presence.
  const tagLinks = page.locator('a[href^="/tags/"]');
  const count = await tagLinks.count();
  test.skip(count === 0, "first post has no tags");

  const slugRe = /^\/tags\/[a-z0-9][a-z0-9-]*$/;
  for (let i = 0; i < count; i++) {
    const href = await tagLinks.nth(i).getAttribute("href");
    expect(href, `post-detail tag link #${i}`).not.toBe("/tags/undefined");
    expect(href, `post-detail tag link #${i}`).toMatch(slugRe);
  }
});
