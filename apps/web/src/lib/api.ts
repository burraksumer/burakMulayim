// Tiny client for the burak.mulayim.app API.
// Server-side only — runs in Astro frontmatter on each request.
// Failures are swallowed and return null so pages can degrade gracefully
// when the backend is unreachable (rare, but possible during deploys).

const SERVER_URL = import.meta.env.PUBLIC_SERVER_URL ?? "http://localhost:3000";

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  description?: string;
  author?: string;
  category?: string;
  tags: string[];
  draft: boolean;
  excerpt: string;
  reading_time: number;
}

export interface Post extends PostMeta {
  body: string;
}

export interface Tag {
  tag: string;
  count: number;
}

export interface LastfmTrack {
  name: string;
  artist: string;
  album?: string;
  url: string;
  image?: string;
  played_at?: string;
  now_playing: boolean;
}

export interface LastfmResponse {
  user: string;
  tracks: LastfmTrack[];
  fetched_at: string;
  last_success_at: string;
  stale: boolean;
}

export interface CarbonResponse {
  url: string;
  green: boolean;
  bytes: number;
  adjusted_bytes: number;
  energy: number;
  gco2e: number;
  cleanerThan: number;
  rating: string;
  fetched_at: string;
  last_success_at: string;
  last_changed_at: string;
  stale: boolean;
}

export interface NowResponse {
  body: string;
  /** First list item from now.md, intended for a homepage one-liner. */
  headline?: string;
  last_modified: string;
}

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
  lastfm: () => safeJson<LastfmResponse>("/lastfm"),
  carbon: () => safeJson<CarbonResponse>("/carbon"),
  now: () => safeJson<NowResponse>("/now"),
};

// ---- shared formatters used across pages ----

export const fmtDate = (iso: string) => iso.slice(0, 10).replace(/-/g, ".");

export const fmtLongDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export const relativeTime = (iso?: string): string => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
};
