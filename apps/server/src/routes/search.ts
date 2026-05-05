import { Elysia, t } from "elysia";

import type { PostStore } from "../posts/store";

export interface SearchRouteDeps {
  store: PostStore;
}

export function searchRoutes({ store }: SearchRouteDeps) {
  return new Elysia().get(
    "/search",
    ({ query }) => {
      const q = (query.q ?? "").trim();
      const limit = query.limit ? Math.min(Math.max(Number(query.limit) || 0, 1), 50) : 20;
      return { query: q, hits: store.search(q, limit) };
    },
    {
      query: t.Object({
        q: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    },
  );
}
