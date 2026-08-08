import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Elysia } from "elysia";

import { fmtLongDate } from "@burakmulayim/shared";

import { renderOgPng } from "../og/render";
import type { PostStore } from "../posts/store";

export interface OgRouteDeps {
  store: PostStore;
  /**
   * Persistent directory for cached PNGs. Lives on the SQLite data volume in
   * production (`/data/og`), so caches survive container restarts. The
   * server creates it on first use.
   */
  cacheDir: string;
}

interface CardCopy {
  title: string;
  subtitle: string;
}

const DEFAULT_COPY: CardCopy = {
  title: "Burak Sümer",
  subtitle: "burak.mulayim.app",
};

// In-memory cache layered on top of the disk cache. Skips the readFile syscall
// on repeat requests within the same process — meaningful when the same
// preview crawler fetches an OG multiple times in succession.
const memCache = new Map<string, Buffer>();

function copyForSlug(store: PostStore, slug: string): CardCopy | null {
  if (slug === "default") return DEFAULT_COPY;
  const post = store.get(slug);
  if (!post) return null;
  return {
    title: post.title,
    subtitle: fmtLongDate(post.date),
  };
}

async function loadOrRender(slug: string, copy: CardCopy, cacheDir: string): Promise<Buffer> {
  const cached = memCache.get(slug);
  if (cached) return cached;

  const diskPath = join(cacheDir, `${slug}.png`);

  // Try disk cache first.
  try {
    const buf = await readFile(diskPath);
    memCache.set(slug, buf);
    return buf;
  } catch {
    // miss — fall through to render
  }

  const png = await renderOgPng(copy);
  // Best-effort write; if disk is read-only, we still serve the in-memory
  // copy so the request succeeds.
  try {
    await mkdir(cacheDir, { recursive: true });
    await writeFile(diskPath, png);
  } catch (err) {
    console.warn(`[og] failed to write cache ${diskPath}:`, err);
  }
  memCache.set(slug, png);
  return png;
}

export function ogRoutes({ store, cacheDir }: OgRouteDeps) {
  // Elysia treats `.` as part of the parameter name, so a path like
  // "/og/:slug.png" produces a single param called "slug.png" instead of
  // "slug" with an extension suffix. Easier to declare the bare param and
  // strip the .png ourselves — keeps the URL contract (/og/<name>.png) intact.
  return new Elysia().get("/og/:slug", async ({ params, status, set }) => {
    if (!params.slug.endsWith(".png")) return status(404, { error: "unknown og slug" });
    const slug = params.slug.slice(0, -".png".length);

    const copy = copyForSlug(store, slug);
    if (!copy) return status(404, { error: "unknown og slug" });

    const png = await loadOrRender(slug, copy, cacheDir);

    set.headers["content-type"] = "image/png";
    // A year is fine — when a post's title changes you'd manually clear the
    // disk cache (rm /data/og/<slug>.png) or rev the slug. Browsers and the
    // Coolify proxy honor this; social platforms re-fetch on URL share.
    set.headers["cache-control"] = "public, max-age=31536000, immutable";
    return png;
  });
}
