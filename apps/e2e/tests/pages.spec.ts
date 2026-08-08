import { test, expect } from "@playwright/test";

// Smoke coverage for every public route on the web app. Each test asserts
// status 200, the expected page heading, and that the global footer renders.
//
// The home page is intentionally out of this file (it has its own dedicated
// home.spec.ts with section-level assertions). Post detail and tag detail
// pages are covered in posts.spec.ts and tags.spec.ts.

const pages: Array<{ path: string; heading: string; titlePrefix: string }> = [
  { path: "/about", heading: "About", titlePrefix: "About" },
  { path: "/now", heading: "Now", titlePrefix: "Now" },
  { path: "/posts", heading: "Writing", titlePrefix: "Writing" },
  { path: "/tags", heading: "Tags", titlePrefix: "Tags" },
];

for (const { path, heading, titlePrefix } of pages) {
  test(`${path} renders 200 with heading "${heading}"`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    // <title> follows the "<page> — Burak Sümer" convention from Layout.astro.
    expect(await page.title()).toBe(`${titlePrefix} — Burak Sümer`);
  });
}

test("home page <title> is just 'Burak Sümer' (default Layout title)", async ({ page }) => {
  await page.goto("/");
  expect(await page.title()).toBe("Burak Sümer");
});

test("/healthz returns 200 with body 'ok'", async ({ request }) => {
  const response = await request.get("/healthz");
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("ok");
});
