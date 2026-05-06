import { dirname, resolve } from "node:path";

import { createDb } from "@burakMulayim/db";
import { env } from "@burakMulayim/env/server";

import { buildApp } from "./app";
import { Cache } from "./cache";
import { loadPosts } from "./posts/loader";
import { PostStore } from "./posts/store";
import { carbonFetcher } from "./upstream/carbon";
import { lastfmFetcher } from "./upstream/lastfm";

const LASTFM_TTL_MS = 5 * 60 * 1000;
const CARBON_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LASTFM_POLL_MS = LASTFM_TTL_MS;

async function main() {
  const db = createDb({ url: env.DATABASE_URL });

  const store = new PostStore(db);
  const postsDir = resolve(process.cwd(), env.POSTS_DIR);
  const contentDir = dirname(postsDir);
  const posts = await loadPosts({ dir: postsDir });
  store.setAll(posts);
  console.log(`[posts] loaded ${posts.length} posts from ${postsDir}`);

  const carbon = carbonFetcher({ url: env.WEBSITECARBON_URL, green: env.WEBSITECARBON_GREEN });
  const lastfm = lastfmFetcher({ user: env.LASTFM_USER, apiKey: env.LASTFM_API_KEY });

  const app = buildApp({
    db,
    store,
    contentDir,
    corsOrigin: env.CORS_ORIGIN,
    carbonTtlMs: CARBON_TTL_MS,
    lastfmTtlMs: LASTFM_TTL_MS,
    carbonFetcher: carbon,
    lastfmFetcher: lastfm,
    site: {
      title: "Burak Sümer",
      description: "Personal blog and notes.",
      siteUrl: "https://burak.mulayim.app",
      feedUrl: "https://burak.mulayim.app/feed.xml",
      jsonFeedUrl: "https://burak.mulayim.app/feed.json",
      author: { name: "Burak Sümer", url: "https://burak.mulayim.app" },
      language: "en",
    },
  });

  const cache = new Cache(db);
  const logger = { warn: (m: string, e: unknown) => console.warn(m, e) };

  // Warm both caches once on boot. Subsequent refreshes are TTL-driven on read.
  cache.get({ key: "carbon", ttlMs: CARBON_TTL_MS, fetcher: carbon, logger }).catch(() => {});
  cache.get({ key: "lastfm", ttlMs: LASTFM_TTL_MS, fetcher: lastfm, logger }).catch(() => {});

  // Last.fm needs frequent updates so the "now playing" stays fresh; carbon lives in TTL only.
  setInterval(() => {
    cache.get({ key: "lastfm", ttlMs: 0, fetcher: lastfm, logger }).catch(() => {});
  }, LASTFM_POLL_MS).unref();

  app.listen(3000, () => console.log("Server is running on http://localhost:3000"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
