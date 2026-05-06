// Tiny client for the burak.mulayim.app API.
// Server-side only — runs in Astro frontmatter on each request.
// Failures are swallowed and return null so pages can degrade gracefully
// when the backend is unreachable (rare, but possible during deploys).
//
// All response types and shared display formatters come from
// `@burakmulayim/shared`. This file is purely the HTTP client glue.

import type {
  Carbon,
  LastfmResponse,
  Now,
  Post,
  PostMeta,
  Tag,
  TagWithPosts,
} from "@burakmulayim/shared";

const SERVER_URL = import.meta.env.PUBLIC_SERVER_URL ?? "http://localhost:3000";

async function safeJson<T>(path: string, timeoutMs = 2_000): Promise<T | null> {
  try {
    const res = await fetch(`${SERVER_URL}${path}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const api = {
  posts: () => safeJson<PostMeta[]>("/posts"),
  post: (slug: string) => safeJson<Post>(`/posts/${encodeURIComponent(slug)}`),
  tags: () => safeJson<Tag[]>("/tags"),
  tag: (name: string) => safeJson<TagWithPosts>(`/tags/${encodeURIComponent(name)}`),
  lastfm: () => safeJson<LastfmResponse>("/lastfm"),
  carbon: () => safeJson<Carbon>("/carbon"),
  now: () => safeJson<Now>("/now"),
};

// Re-export shared primitives so page frontmatter can do a single import
// (`import { api, fmtDate, slugify } from "../lib/api"`).
export type {
  Carbon,
  LastfmResponse,
  LastfmTrack,
  Now,
  Post,
  PostMeta,
  Tag,
  TagWithPosts,
} from "@burakmulayim/shared";
export { fmtDate, fmtLongDate, relativeTime, slugify } from "@burakmulayim/shared";
