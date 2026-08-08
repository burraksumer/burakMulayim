import type { Post, PostMeta, SearchHit, Tag } from "@burakmulayim/shared";
import { slugify } from "@burakmulayim/shared";

import { toMeta } from "./loader";

export class PostStore {
  private bySlug = new Map<string, Post>();

  setAll(posts: Post[]) {
    this.bySlug.clear();
    for (const p of posts) {
      this.bySlug.set(p.slug, p);
    }
  }

  list(): PostMeta[] {
    return Array.from(this.bySlug.values())
      .toSorted((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .map(toMeta);
  }

  get(slug: string): Post | undefined {
    return this.bySlug.get(slug);
  }

  tags(): Tag[] {
    const counts = new Map<string, number>();
    for (const p of this.bySlug.values()) {
      for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, slug: slugify(tag), count }))
      .toSorted((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /**
   * Find posts by tag. Accepts the canonical display form, the lowercase form,
   * the URL slug, or any free-form input that slugifies to the same value —
   * lookup is purely by slug equivalence. Returns the canonical display form
   * (`canonical`) and the canonical slug (`slug`) so callers can render the
   * proper capitalization and decide whether to redirect to the canonical URL.
   */
  byTag(input: string): { canonical: string; slug: string; posts: PostMeta[] } | null {
    const slug = slugify(input);
    if (!slug) return null;
    const matching = this.list().filter((p) => p.tags.some((t) => slugify(t) === slug));
    if (matching.length === 0) return null;
    const canonical = matching[0]!.tags.find((t) => slugify(t) === slug)!;
    return { canonical, slug, posts: matching };
  }

  /**
   * In-memory search over title, body, and tags. Case-insensitive substring
   * matching with OR semantics across terms; ranked by a coarse score
   * (title > tag > body). Snippets built around the first matched term
   * in the body, with the match wrapped in `<mark>`.
   *
   * Trade vs the prior FTS5 implementation: no stemming, no BM25 ranking,
   * no fuzzy matching. Acceptable at this scale (handful of posts loaded
   * into memory at boot). If search ever becomes a hotspot or quality
   * matters more, switch back to FTS5 — the route + return shape stays
   * the same.
   */
  search(query: string, limit = 20): SearchHit[] {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];

    const terms = trimmed
      .split(/\s+/u)
      .map((t) => t.toLowerCase())
      .filter((t) => t.length > 0);
    if (terms.length === 0) return [];

    type Scored = { post: Post; score: number; snippet: string };
    const scored: Scored[] = [];

    for (const post of this.bySlug.values()) {
      const titleLower = post.title.toLowerCase();
      const bodyLower = post.body.toLowerCase();
      const tagsLower = post.tags.join(" ").toLowerCase();

      let score = 0;
      let snippetTerm: string | undefined;

      for (const term of terms) {
        // Coarse field weighting: title beats tag beats body. Each field
        // counts once per term — multiple matches in the same field don't
        // dominate the ranking.
        if (titleLower.includes(term)) score += 3;
        if (tagsLower.includes(term)) score += 2;
        if (bodyLower.includes(term)) {
          score += 1;
          if (!snippetTerm) snippetTerm = term;
        }
      }

      if (score > 0) {
        // Snippet falls back to the post's excerpt when matches were only
        // in title/tags — keeps the hit row from being snippet-less.
        const snippet = snippetTerm ? buildSnippet(post.body, snippetTerm) : post.excerpt;
        scored.push({ post, score, snippet });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ post, score, snippet }) => ({
      ...toMeta(post),
      score,
      snippet,
    }));
  }
}

const SNIPPET_CONTEXT = 40;

/**
 * Build a snippet around the first occurrence of `term` (lowercase, already
 * trimmed) in `body`. The matched substring is wrapped in `<mark>` using its
 * original casing. Leading/trailing ellipses indicate truncation.
 */
function buildSnippet(body: string, term: string): string {
  const lower = body.toLowerCase();
  const idx = lower.indexOf(term);
  if (idx === -1) return body.slice(0, SNIPPET_CONTEXT * 2);

  const start = Math.max(0, idx - SNIPPET_CONTEXT);
  const end = Math.min(body.length, idx + term.length + SNIPPET_CONTEXT);
  const slice = body.slice(start, end);
  const offsetInSlice = idx - start;
  const matched = slice.slice(offsetInSlice, offsetInSlice + term.length);
  const wrapped =
    slice.slice(0, offsetInSlice) +
    `<mark>${matched}</mark>` +
    slice.slice(offsetInSlice + term.length);
  return (start > 0 ? "…" : "") + wrapped + (end < body.length ? "…" : "");
}
