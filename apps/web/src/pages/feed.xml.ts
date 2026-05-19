import type { APIRoute } from "astro";

import { proxyUpstream } from "../lib/upstream-proxy";

// RSS feed served on the apex so the autodiscovery <link> in Layout.astro
// resolves same-origin. Upstream is the API's feed builder.
export const GET: APIRoute = () =>
  proxyUpstream({
    path: "/feed.xml",
    contentType: "application/rss+xml; charset=utf-8",
  });
