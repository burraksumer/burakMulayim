// Thin pass-through used by apex-served crawler/feed routes that delegate to
// the API server (sitemap, RSS, JSON Feed). Each consumer route is a 1-line
// wrapper over this — keeps content-type and error handling in one place.
//
// On upstream failure we return 502 instead of an empty 200 so crawlers and
// feed readers don't cache a bad response.

export interface ProxyOptions {
  /** Path on the API server, e.g. "/feed.xml". */
  path: string;
  /** Content-Type to send back to the client. Should match upstream's. */
  contentType: string;
  /**
   * `cache-control: max-age` in seconds. Short by default — these resources
   * are tiny and change whenever a post or now.md is touched.
   */
  cacheSeconds?: number;
}

export async function proxyUpstream({
  path,
  contentType,
  cacheSeconds = 300,
}: ProxyOptions): Promise<Response> {
  const upstream = new URL(path, import.meta.env.PUBLIC_SERVER_URL);

  try {
    const res = await fetch(upstream);
    if (!res.ok) {
      return new Response(`upstream ${path} unavailable`, { status: 502 });
    }
    // arrayBuffer (not text) so this helper handles binary upstreams (PNGs,
    // images) as well as text (XML, JSON). Response body works the same way;
    // the client-side content-type header drives parsing.
    const body = await res.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": `public, max-age=${cacheSeconds}`,
      },
    });
  } catch {
    return new Response(`upstream ${path} unreachable`, { status: 502 });
  }
}
