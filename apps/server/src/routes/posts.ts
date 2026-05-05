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
      const tag = decodeURIComponent(params.tag);
      const posts = store.byTag(tag);
      if (posts.length === 0) return status(404, { error: "tag not found" });
      return { tag, posts };
    });
}
