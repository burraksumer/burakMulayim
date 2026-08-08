import { describe, expect, it } from "bun:test";

import { extractHeadline, makeExcerpt, readingTime, stripInlineMarkdown } from "./markdown";

describe("stripInlineMarkdown", () => {
  it("removes bold (**...** and __...__)", () => {
    expect(stripInlineMarkdown("a **bold** thing")).toBe("a bold thing");
    expect(stripInlineMarkdown("a __bold__ thing")).toBe("a bold thing");
  });

  it("removes italic (*...* and _..._)", () => {
    expect(stripInlineMarkdown("an *italic* phrase")).toBe("an italic phrase");
    expect(stripInlineMarkdown("an _italic_ phrase")).toBe("an italic phrase");
  });

  it("removes inline code", () => {
    expect(stripInlineMarkdown("use `bun` daily")).toBe("use bun daily");
  });

  it("keeps the link text and drops the URL", () => {
    expect(stripInlineMarkdown("see [docs](https://example.com)")).toBe("see docs");
  });

  it("trims surrounding whitespace", () => {
    expect(stripInlineMarkdown("  spaced  ")).toBe("spaced");
  });
});

describe("extractHeadline", () => {
  it("strips bold around the subject", () => {
    expect(extractHeadline("- **Building** stuff — a description.")).toBe("Building stuff");
  });
  it("returns the whole bullet when no separator is present", () => {
    expect(extractHeadline("- Just a single short item")).toBe("Just a single short item");
  });
  it("ignores headings before the first bullet", () => {
    expect(extractHeadline("## Heading\n\n- First bullet — detail")).toBe("First bullet");
  });
  it("strips link syntax", () => {
    expect(extractHeadline("- [burak.mulayim.app](https://burak.mulayim.app) — site")).toBe(
      "burak.mulayim.app",
    );
  });
  it("splits on en dash with spaces", () => {
    expect(extractHeadline("- Reading list – books for May")).toBe("Reading list");
  });
  it("splits on hyphen with spaces", () => {
    expect(extractHeadline("- Reading list - books for May")).toBe("Reading list");
  });
  it("splits on colon followed by a space", () => {
    expect(extractHeadline("- Currently: writing the next post")).toBe("Currently");
  });
  it("does not split on hyphens inside words or URLs", () => {
    expect(extractHeadline("- Visiting burak.mulayim.app/foo-bar today")).toBe(
      "Visiting burak.mulayim.app/foo-bar today",
    );
  });
  it("uses the earliest separator when multiple are present", () => {
    expect(extractHeadline("- Title: subtitle — detail")).toBe("Title");
  });
  it("returns undefined when no list item exists", () => {
    expect(extractHeadline("Just a paragraph, no bullets here.")).toBeUndefined();
  });
});

describe("readingTime", () => {
  it("returns at least 1 minute for any non-empty body", () => {
    expect(readingTime("just a few words here")).toBe(1);
  });
  it("scales with word count (~220 wpm)", () => {
    const body = "word ".repeat(440); // 2 minutes worth
    expect(readingTime(body)).toBe(2);
  });
  it("returns 1 for an empty string (clamped to minimum)", () => {
    expect(readingTime("")).toBe(1);
  });
});

describe("makeExcerpt", () => {
  it("prefers the explicit description when provided", () => {
    expect(makeExcerpt("hand-written summary", "body content")).toBe("hand-written summary");
  });

  it("falls back to the first non-heading paragraph", () => {
    const body = "# Heading\n\nFirst real paragraph.\n\nSecond.";
    expect(makeExcerpt(undefined, body)).toBe("First real paragraph.");
  });

  it("strips inline formatting characters from the fallback", () => {
    const body = "**Bold** intro paragraph with `code`.";
    expect(makeExcerpt(undefined, body)).toBe("Bold intro paragraph with code.");
  });

  it("clamps very long paragraphs to 280 chars with an ellipsis", () => {
    const body = "x ".repeat(200);
    const got = makeExcerpt(undefined, body);
    expect(got.endsWith("...")).toBe(true);
    expect(got.length).toBeLessThanOrEqual(280);
  });

  it("returns an empty string when there's nothing usable", () => {
    expect(makeExcerpt(undefined, "")).toBe("");
    expect(makeExcerpt("", "# Only a heading")).toBe("");
  });
});
