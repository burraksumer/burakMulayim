import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";

import { PostListSchema, PostSchema } from "@burakMulayim/shared";

import { loadPosts, parsePost } from "./loader";

const FIXTURES = resolve(import.meta.dir, "../../test/fixtures/posts");

describe("parsePost", () => {
  it("parses frontmatter and computes derived fields", () => {
    const raw = `---
title: Sample
date: 2024-05-01
description: A description.
category: Tech
tags:
  - a
  - b
---

Body paragraph one.

Body paragraph two.
`;
    const post = parsePost("sample.md", raw);
    expect(post.slug).toBe("sample");
    expect(post.title).toBe("Sample");
    expect(post.date).toBe("2024-05-01");
    expect(post.tags).toEqual(["a", "b"]);
    expect(post.excerpt).toBe("A description.");
    expect(post.reading_time).toBeGreaterThanOrEqual(1);
    expect(post.body).toContain("Body paragraph");
    expect(PostSchema.safeParse(post).success).toBe(true);
  });

  it("falls back to category when no tags array is present", () => {
    const raw = `---
title: T
date: 2024-01-01
category: Solo
---

x
`;
    const post = parsePost("x.md", raw);
    expect(post.tags).toEqual(["Solo"]);
  });

  it("derives excerpt from first non-heading paragraph when description is missing", () => {
    const raw = `---
title: T
date: 2024-01-01
---

# Heading

First real paragraph.

Second.
`;
    const post = parsePost("x.md", raw);
    expect(post.excerpt).toBe("First real paragraph.");
  });

  it("throws when title is missing", () => {
    const raw = `---
date: 2024-01-01
---

x
`;
    expect(() => parsePost("x.md", raw)).toThrow();
  });

  it("throws when date is missing", () => {
    const raw = `---
title: x
---

x
`;
    expect(() => parsePost("x.md", raw)).toThrow();
  });
});

describe("loadPosts", () => {
  it("loads, sorts by date desc, and excludes drafts by default", async () => {
    const posts = await loadPosts({ dir: FIXTURES });
    expect(posts.length).toBeGreaterThanOrEqual(2);
    const slugs = posts.map((p) => p.slug);
    expect(slugs).toContain("hello");
    expect(slugs).toContain("no-description");
    expect(slugs).not.toContain("draft");

    // Sorted desc by date
    for (let i = 0; i < posts.length - 1; i += 1) {
      expect(posts[i]!.date >= posts[i + 1]!.date).toBe(true);
    }

    expect(PostListSchema.safeParse(posts.map(({ body: _b, ...m }) => m)).success).toBe(true);
  });

  it("includes drafts when requested", async () => {
    const posts = await loadPosts({ dir: FIXTURES, includeDrafts: true });
    expect(posts.map((p) => p.slug)).toContain("draft");
  });
});
