import { describe, expect, it } from "bun:test";
import type { Post } from "@burakmulayim/shared";

import { buildArticleJsonLd } from "./post-jsonld";

const POST: Post = {
  slug: "switch-to-astro",
  title: "Why did I switch to Astro?",
  date: "2023-02-07",
  description: "Short summary.",
  excerpt: "Longer excerpt used as fallback when description is missing.",
  tags: ["Technology"],
  reading_time: 5,
  draft: false,
  body: "# Body\n\nMarkdown content here.",
};

const SITE = {
  siteUrl: "https://burak.mulayim.app",
  authorName: "Burak Sümer",
  authorUrl: "https://burak.mulayim.app",
};

describe("buildArticleJsonLd", () => {
  it("emits the schema.org BlogPosting envelope", () => {
    const jsonld = buildArticleJsonLd(POST, SITE);
    expect(jsonld["@context"]).toBe("https://schema.org");
    expect(jsonld["@type"]).toBe("BlogPosting");
  });

  it("copies title, dates, description, and keywords from the post", () => {
    const jsonld = buildArticleJsonLd(POST, SITE);
    expect(jsonld.headline).toBe(POST.title);
    expect(jsonld.datePublished).toBe(POST.date);
    expect(jsonld.dateModified).toBe(POST.date);
    expect(jsonld.description).toBe(POST.description!);
    expect(jsonld.keywords).toEqual(POST.tags);
  });

  it("falls back to excerpt when post.description is missing", () => {
    const withoutDescription: Post = { ...POST, description: undefined };
    const jsonld = buildArticleJsonLd(withoutDescription, SITE);
    expect(jsonld.description).toBe(POST.excerpt);
  });

  it("builds absolute URLs for url, image, and mainEntityOfPage", () => {
    const jsonld = buildArticleJsonLd(POST, SITE);
    expect(jsonld.url).toBe("https://burak.mulayim.app/posts/switch-to-astro");
    expect(jsonld.image).toBe("https://burak.mulayim.app/og/switch-to-astro.png");
    expect(jsonld.mainEntityOfPage["@id"]).toBe(jsonld.url);
  });

  it("uses the post's author when set, site author otherwise", () => {
    const fromPost: Post = { ...POST, author: "Guest Writer" };
    expect(buildArticleJsonLd(fromPost, SITE).author.name).toBe("Guest Writer");
    expect(buildArticleJsonLd(POST, SITE).author.name).toBe(SITE.authorName);
  });

  it("emits author.url and publisher.url when site.authorUrl is set", () => {
    const jsonld = buildArticleJsonLd(POST, SITE);
    expect(jsonld.author.url).toBe(SITE.authorUrl);
    expect(jsonld.publisher.url).toBe(SITE.authorUrl);
  });

  it("omits author.url and publisher.url when site.authorUrl is undefined", () => {
    // Build without authorUrl entirely; `exactOptionalPropertyTypes` rejects
    // an explicit `authorUrl: undefined`, so we strip the key.
    const { authorUrl: _drop, ...withoutAuthorUrl } = SITE;
    const jsonld = buildArticleJsonLd(POST, withoutAuthorUrl);
    expect(jsonld.author).not.toHaveProperty("url");
    expect(jsonld.publisher).not.toHaveProperty("url");
  });

  it("serializes to valid JSON (round-trips through JSON.stringify)", () => {
    const jsonld = buildArticleJsonLd(POST, SITE);
    const roundTripped = JSON.parse(JSON.stringify(jsonld)) as typeof jsonld;
    expect(roundTripped).toEqual(jsonld);
  });
});
