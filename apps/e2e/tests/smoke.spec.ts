import { test, expect } from "@playwright/test";

test("home page renders with title and footer", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);

  // The home page has an <h1> "Burak Sümer" rendered by index.astro.
  await expect(page.locator("h1")).toHaveText("Burak Sümer");

  // SiteFooter renders a <footer> on every page via Layout.astro.
  await expect(page.locator("footer")).toBeVisible();
});
