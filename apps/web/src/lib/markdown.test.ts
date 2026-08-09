import { describe, expect, it } from "bun:test";

import { renderMarkdown } from "./markdown";

describe("renderMarkdown — link rendering", () => {
  it("opens external https links in a new tab with safe rel", async () => {
    const html = await renderMarkdown("[Astro](https://astro.build)");
    expect(html).toContain('href="https://astro.build"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("opens external http links the same way", async () => {
    const html = await renderMarkdown("[old site](http://example.com)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("does not add target/rel to relative-path links (internal navigation)", async () => {
    const html = await renderMarkdown("[other post](/posts/letter-1)");
    expect(html).toContain('href="/posts/letter-1"');
    expect(html).not.toContain("target=");
    expect(html).not.toContain("noopener");
  });

  it("does not add target/rel to fragment anchors", async () => {
    const html = await renderMarkdown("[jump](#section)");
    expect(html).not.toContain("target=");
    expect(html).not.toContain("noopener");
  });

  it("does not add target/rel to mailto links", async () => {
    // mailto: opens the OS mail handler, not a new browser page. target=_blank
    // would be harmless but redundant; we keep markup minimal.
    const html = await renderMarkdown("[email me](mailto:burak@mulayim.app)");
    expect(html).toContain('href="mailto:burak@mulayim.app"');
    expect(html).not.toContain("target=");
  });

  it("tags external links for Umami click tracking", async () => {
    const html = await renderMarkdown("[Astro](https://astro.build)");
    expect(html).toContain('data-umami-event="external-link"');
    expect(html).toContain('data-umami-event-href="https://astro.build"');
  });

  it("tags mailto links for tracking too — they leave the site as much as http does", async () => {
    const html = await renderMarkdown("[email me](mailto:burak@mulayim.app)");
    expect(html).toContain('data-umami-event="external-link"');
  });

  it("leaves internal links untracked so they are not double-counted as pageviews", async () => {
    const html = await renderMarkdown("[other post](/posts/letter-1)");
    expect(html).not.toContain("data-umami-event");
  });

  it("preserves markdown formatting inside link text", async () => {
    // Bold inside the link should still render as <strong>, not be eaten by
    // the custom renderer.
    const html = await renderMarkdown("[**Astro**](https://astro.build)");
    expect(html).toContain("<strong>Astro</strong>");
  });

  it("preserves title attribute when present", async () => {
    const html = await renderMarkdown('[Astro](https://astro.build "the docs")');
    expect(html).toContain('title="the docs"');
  });
});

describe("renderMarkdown — basic markdown features still work", () => {
  it("renders paragraphs", async () => {
    const html = await renderMarkdown("hello world");
    expect(html).toContain("<p>hello world</p>");
  });

  it("renders headings", async () => {
    const html = await renderMarkdown("# Heading");
    expect(html).toContain("<h1>Heading</h1>");
  });

  it("renders inline code", async () => {
    const html = await renderMarkdown("use `bun install`");
    expect(html).toContain("<code>bun install</code>");
  });

  it("does not turn single newlines into <br> (breaks: false)", async () => {
    // GFM with breaks:false treats consecutive lines as one paragraph.
    // Important for prose-heavy markdown where line wrapping is editor-driven.
    const html = await renderMarkdown("line one\nline two");
    expect(html).not.toContain("<br>");
  });
});
