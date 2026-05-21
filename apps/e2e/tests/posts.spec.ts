import { test, expect } from "@playwright/test";

test("posts index lists posts; clicking the first navigates to post detail", async ({ page }) => {
  const response = await page.goto("/posts");
  expect(response?.status()).toBe(200);

  // PostList renders <a> elements. We accept any link inside the page main
  // that goes to /posts/<slug> and click the first one.
  const firstPostLink = page.locator('a[href^="/posts/"]').first();
  await expect(firstPostLink).toBeVisible();

  const href = await firstPostLink.getAttribute("href");
  expect(href).toMatch(/^\/posts\/[^/]+$/);

  await firstPostLink.click();
  await expect(page).toHaveURL(new RegExp(`${href}/?$`));

  // Post detail should render content. <main> wraps the whole page (via the
  // PageMain component) — stable, present on every page.
  await expect(page.locator("main")).toBeVisible();
});

test("post detail page renders substantive body content", async ({ page }) => {
  // Walk to the first post and assert its rendered body has meaningful
  // length — not just the layout chrome (breadcrumb, header, footer). The
  // 200-char threshold is well below any real post body but well above the
  // layout text that would render even with an empty post.
  await page.goto("/posts");
  await page.locator('a[href^="/posts/"]').first().click();
  await page.waitForURL(/\/posts\/[^/]+\/?$/);
  const bodyText = await page.locator("main").innerText();
  expect(bodyText.length).toBeGreaterThan(200);
});

test("external links in post markdown open in a new tab with safe rel", async ({ page }) => {
  // switch-to-astro.md links to https://github.com/burraksumer/burakMulayim
  // in its body. The markdown renderer must rewrite that to target=_blank +
  // rel=noopener noreferrer; without it, clicking a reference link kicks the
  // reader off the page they were reading.
  await page.goto("/posts/switch-to-astro");
  const externalLink = page.locator('article a[href^="https://"]').first();
  await expect(externalLink).toBeVisible();
  await expect(externalLink).toHaveAttribute("target", "_blank");
  await expect(externalLink).toHaveAttribute("rel", /noopener/);
  await expect(externalLink).toHaveAttribute("rel", /noreferrer/);
});
