import { Elysia } from "elysia";

import type { PostStore } from "../posts/store";
import { buildJsonFeed, buildRss, buildSitemap, type FeedSiteConfig } from "../feeds";

export interface FeedRouteDeps {
  store: PostStore;
  site: FeedSiteConfig;
}

export function feedRoutes({ store, site }: FeedRouteDeps) {
  return new Elysia()
    .get("/feed.xml", ({ set }) => {
      set.headers["content-type"] = "application/rss+xml; charset=utf-8";
      return buildRss(site, store.list());
    })
    .get("/feed.json", () => {
      const fullPosts = store
        .list()
        .map((m) => store.get(m.slug))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));
      return buildJsonFeed(site, fullPosts);
    })
    .get("/sitemap.xml", ({ set }) => {
      set.headers["content-type"] = "application/xml; charset=utf-8";
      return buildSitemap(site, store.list());
    });
}
