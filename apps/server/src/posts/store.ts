import type { DbClient } from "@burakmulayim/db";
import type { Post, PostMeta, SearchHit, Tag } from "@burakmulayim/shared";
import { slugify } from "@burakmulayim/shared";

import { toMeta } from "./loader";

export class PostStore {
  private bySlug = new Map<string, Post>();

  constructor(private db: DbClient) {}

  setAll(posts: Post[]) {
    this.bySlug.clear();
    this.db.sqlite.exec("DELETE FROM posts_fts;");
    const insert = this.db.sqlite.prepare(
      "INSERT INTO posts_fts (slug, title, body, tags) VALUES (?, ?, ?, ?)",
    );
    const tx = this.db.sqlite.transaction((rows: Post[]) => {
      for (const p of rows) {
        insert.run(p.slug, p.title, p.body, p.tags.join(" "));
        this.bySlug.set(p.slug, p);
      }
    });
    tx(posts);
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

  search(query: string, limit = 20): SearchHit[] {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];
    const ftsQuery = trimmed
      .split(/\s+/u)
      .filter((t) => t.length > 0)
      .map((t) => `"${t.replace(/"/gu, '""')}"`)
      .join(" OR ");
    if (ftsQuery.length === 0) return [];

    type Row = { slug: string; score: number; snippet: string };
    let rows: Row[];
    try {
      rows = this.db.sqlite
        .query<Row, [string, number]>(
          `SELECT slug, bm25(posts_fts) AS score, snippet(posts_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet
           FROM posts_fts WHERE posts_fts MATCH ? ORDER BY score LIMIT ?`,
        )
        .all(ftsQuery, limit);
    } catch {
      return [];
    }

    const hits: SearchHit[] = [];
    for (const r of rows) {
      const post = this.bySlug.get(r.slug);
      if (!post) continue;
      hits.push({ ...toMeta(post), score: r.score, snippet: r.snippet });
    }
    return hits;
  }
}
