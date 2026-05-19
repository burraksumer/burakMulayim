import type { APIRoute } from "astro";

import { proxyUpstream } from "../lib/upstream-proxy";

// Search engines crawl the apex (`burak.mulayim.app`) but the sitemap is
// built by the API server. Proxy through so the canonical sitemap URL lives
// where crawlers expect it.
export const GET: APIRoute = () =>
  proxyUpstream({
    path: "/sitemap.xml",
    contentType: "application/xml; charset=utf-8",
  });
