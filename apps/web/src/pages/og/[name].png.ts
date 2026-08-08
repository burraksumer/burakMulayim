import type { APIRoute } from "astro";

import { proxyUpstream } from "../../lib/upstream-proxy";

// Apex-served OG image. Proxies to the API server which renders + disk-caches
// the actual PNG (see apps/server/src/routes/og.ts). Apex hosting matters
// because most social platforms validate that the image URL is same-origin
// with the og:url.
//
// `name` is either "default" or a post slug. Unknown slugs return 502 here
// (the upstream 404 is mapped to 502 by proxyUpstream so we don't lie about
// the source of the failure).
export const GET: APIRoute = ({ params }) =>
  proxyUpstream({
    path: `/og/${params.name}.png`,
    contentType: "image/png",
    // Same TTL as the upstream; Cache-Control on the response is what
    // browsers and the Coolify proxy actually use.
    cacheSeconds: 31_536_000,
  });
