import { test, expect } from "@playwright/test";

// Home page section coverage. Asserts the four conceptual zones rendered by
// apps/web/src/pages/index.astro: identity (h1 + bio), Writing (recent posts +
// "all posts" link), Currently (now-playing or now-doing — conditional), and
// Elsewhere (social links).

test("home identity: h1, bio, and 'about me' link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Burak Sümer" })).toBeVisible();
  // Bio paragraph mentions "Software engineer" and links to /about.
  await expect(page.getByText(/Software engineer/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /more about me/i })).toHaveAttribute(
    "href",
    "/about",
  );
});

test("home Writing section: shows recent posts and 'all posts' link", async ({ page }) => {
  await page.goto("/");
  // The section is labeled "Writing" via SectionLabel.
  await expect(page.getByText("Writing", { exact: true })).toBeVisible();
  // At least one recent post link, plus an "all posts" link to /posts.
  const postLinks = page.locator('a[href^="/posts/"]');
  expect(await postLinks.count()).toBeGreaterThan(0);
  await expect(page.getByRole("link", { name: /all posts/i })).toHaveAttribute("href", "/posts");
});

test("home Elsewhere section: social links present and absolute", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Elsewhere", { exact: true })).toBeVisible();
  // GitHub link is external and resolves to a real URL.
  const githubLink = page.getByRole("link", { name: "github" });
  await expect(githubLink).toBeVisible();
  const githubHref = await githubLink.getAttribute("href");
  expect(githubHref).toMatch(/^https:\/\/github\.com\//);
  // Email is a mailto: link.
  const emailLink = page.getByRole("link", { name: "email" });
  await expect(emailLink).toBeVisible();
  const emailHref = await emailLink.getAttribute("href");
  expect(emailHref).toMatch(/^mailto:/);
});

test("home Currently section: renders with nowTrack from /lastfm", async ({ page }) => {
  // /lastfm returns at least one track in normal operation, which makes the
  // home page's `nowTrack || now` conditional truthy and renders the
  // "Currently" section. If this section is missing, /lastfm is broken (or
  // the cache fallback didn't catch the failure) — fail loudly.
  await page.goto("/");
  await expect(page.getByText("Currently", { exact: true })).toBeVisible();
});
