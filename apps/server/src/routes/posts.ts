import { Elysia } from "elysia";

import type { PostStore } from "../posts/store";

export interface PostRouteDeps {
  store: PostStore;
}

export function postRoutes({ store }: PostRouteDeps) {
  return new Elysia()
    .get("/posts", () => store.list())
    .get("/posts/:slug", ({ params, status }) => {
      const post = store.get(params.slug);
      if (!post) return status(404, { error: "not found" });
      return post;
    })
    .get("/tags", () => store.tags())
    .get("/tags/:tag", ({ params, status }) => {
      const input = decodeURIComponent(params.tag);
      const result = store.byTag(input);
      if (!result) return status(404, { error: "tag not found" });
      return { tag: result.canonical, slug: result.slug, posts: result.posts };
    });
}
