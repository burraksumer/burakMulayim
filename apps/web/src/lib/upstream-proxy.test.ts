import { afterEach, beforeEach, describe, expect, it, spyOn, type Mock } from "bun:test";

// Must be set before the module under test is imported — the URL constructor
// in proxyUpstream() reads import.meta.env.PUBLIC_SERVER_URL eagerly at call
// time. Without this, `new URL(path, undefined)` throws.
process.env["PUBLIC_SERVER_URL"] = "http://upstream.test";

import { proxyUpstream } from "./upstream-proxy";

let fetchSpy: Mock<typeof fetch>;

beforeEach(() => {
  fetchSpy = spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
});

describe("proxyUpstream — happy path", () => {
  it("forwards a successful body through with the requested content-type", async () => {
    fetchSpy.mockResolvedValue(new Response("<rss />", { status: 200 }));
    const res = await proxyUpstream({
      path: "/feed.xml",
      contentType: "application/rss+xml; charset=utf-8",
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
    expect(await res.text()).toBe("<rss />");
  });

  it("sets cache-control with the default 300s when none provided", async () => {
    fetchSpy.mockResolvedValue(new Response("body", { status: 200 }));
    const res = await proxyUpstream({ path: "/sitemap.xml", contentType: "application/xml" });
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
  });

  it("honors a custom cacheSeconds value", async () => {
    fetchSpy.mockResolvedValue(new Response("body", { status: 200 }));
    const res = await proxyUpstream({
      path: "/og/default.png",
      contentType: "image/png",
      cacheSeconds: 31_536_000,
    });
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000");
  });

  it("handles binary upstreams without corrupting bytes", async () => {
    // PNG magic + arbitrary bytes — verifies we use arrayBuffer (not text)
    // so non-UTF-8 payloads round-trip cleanly.
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    fetchSpy.mockResolvedValue(new Response(pngHeader, { status: 200 }));

    const res = await proxyUpstream({ path: "/og/default.png", contentType: "image/png" });
    const received = new Uint8Array(await res.arrayBuffer());
    expect(received).toEqual(pngHeader);
  });

  it("calls the upstream against the configured PUBLIC_SERVER_URL", async () => {
    fetchSpy.mockResolvedValue(new Response("x", { status: 200 }));
    await proxyUpstream({ path: "/feed.xml", contentType: "application/rss+xml" });

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as URL;
    expect(calledUrl.origin).toBe("http://upstream.test");
    expect(calledUrl.pathname).toBe("/feed.xml");
  });
});

describe("proxyUpstream — failure modes", () => {
  it("returns 502 with a body that names the path when upstream responds non-2xx", async () => {
    fetchSpy.mockResolvedValue(new Response("not found", { status: 404 }));
    const res = await proxyUpstream({ path: "/feed.xml", contentType: "application/rss+xml" });

    expect(res.status).toBe(502);
    expect(await res.text()).toContain("/feed.xml");
  });

  it("returns 502 when fetch itself throws (upstream unreachable)", async () => {
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await proxyUpstream({ path: "/sitemap.xml", contentType: "application/xml" });

    expect(res.status).toBe(502);
    expect(await res.text()).toContain("/sitemap.xml");
  });

  it("does not leak a 200 with empty body — the 502 is what crawlers see", async () => {
    // Important for SEO/feed-reader behavior: an empty 200 would get cached
    // as the canonical feed. Returning 502 forces the client to retry later.
    fetchSpy.mockResolvedValue(new Response("oops", { status: 500 }));
    const res = await proxyUpstream({ path: "/og/default.png", contentType: "image/png" });
    expect(res.status).not.toBe(200);
    expect(res.status).toBe(502);
  });
});
