import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import matter from "gray-matter";

import type { Post, PostMeta } from "@burakmulayim/shared";

const WORDS_PER_MINUTE = 220;

export interface LoadPostsOptions {
  dir: string;
  includeDrafts?: boolean;
}

interface RawFrontmatter {
  title?: string;
  date?: Date | string;
  description?: string;
  author?: string;
  category?: string;
  tags?: string[];
  draft?: boolean;
}

function slugFromFilename(file: string): string {
  return basename(file, extname(file));
}

function toIsoDate(value: Date | string | undefined): string {
  if (!value) throw new Error("post is missing `date` in frontmatter");
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

function readingTime(body: string): number {
  const words = body.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function makeExcerpt(description: string | undefined, body: string): string {
  if (description && description.trim().length > 0) return description.trim();
  const firstPara = body
    .split(/\n{2,}/u)
    .map((s) => s.trim())
    .find((s) => s.length > 0 && !s.startsWith("#"));
  if (!firstPara) return "";
  const stripped = firstPara.replace(/[*_`>#]+/gu, "");
  return stripped.length <= 280 ? stripped : `${stripped.slice(0, 277).trimEnd()}...`;
}

function deriveTags(fm: RawFrontmatter): string[] {
  if (Array.isArray(fm.tags) && fm.tags.length > 0)
    return [...new Set(fm.tags.map((t) => String(t).trim()))];
  if (fm.category) return [fm.category.trim()];
  return [];
}

export function parsePost(filename: string, raw: string): Post {
  const slug = slugFromFilename(filename);
  const { data, content } = matter(raw);
  const fm = data as RawFrontmatter;

  if (!fm.title) throw new Error(`post ${slug} is missing \`title\``);

  const body = content.trim();
  return {
    slug,
    title: fm.title,
    date: toIsoDate(fm.date),
    description: fm.description?.trim(),
    author: fm.author?.trim(),
    category: fm.category?.trim(),
    tags: deriveTags(fm),
    draft: Boolean(fm.draft),
    excerpt: makeExcerpt(fm.description, body),
    reading_time: readingTime(body),
    body,
  };
}

export async function loadPosts({ dir, includeDrafts = false }: LoadPostsOptions): Promise<Post[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  const posts: Post[] = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), "utf8");
    const post = parsePost(file, raw);
    if (post.draft && !includeDrafts) continue;
    posts.push(post);
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return posts;
}

export function toMeta(p: Post): PostMeta {
  const { body: _body, ...meta } = p;
  return meta;
}
