import type { APIRoute } from "astro";

import { proxyUpstream } from "../lib/upstream-proxy";

// JSON Feed v1.1 served on the apex. Pair to /feed.xml; both are advertised
// via <link rel="alternate"> in Layout.astro.
export const GET: APIRoute = () =>
  proxyUpstream({
    path: "/feed.json",
    contentType: "application/feed+json; charset=utf-8",
  });
