import { describe, expect, it } from "bun:test";

import { carbonFetcher } from "./carbon";

const dataResponse = {
  bytes: 12345,
  green: true,
  gco2e: 0.00557,
  rating: "A+",
  cleanerThan: 0.99,
  statistics: {
    adjustedBytes: 9319.68,
    energy: 0.0000138,
    co2: {
      grid: { grams: 0.0068, litres: 0.0037 },
      renewable: { grams: 0.0055, litres: 0.0031 },
    },
  },
};

function makeFetch(opts: {
  pageBytes: number;
  pageStatus?: number;
  dataStatus?: number;
}): typeof globalThis.fetch {
  return (async (input: string | URL | Request): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("api.websitecarbon.com/data")) {
      return new Response(JSON.stringify(dataResponse), {
        status: opts.dataStatus ?? 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(new ArrayBuffer(opts.pageBytes), {
      status: opts.pageStatus ?? 200,
    });
  }) as typeof globalThis.fetch;
}

describe("carbonFetcher", () => {
  it("measures the page in bytes and forwards them to /data", async () => {
    const calls: string[] = [];
    const fetch = (async (input: string | URL | Request): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      calls.push(url);
      return makeFetch({ pageBytes: 12345 })(input as Parameters<typeof globalThis.fetch>[0]);
    }) as typeof globalThis.fetch;

    const fn = carbonFetcher({ url: "https://burak.mulayim.app", green: true, fetch });
    const result = await fn();

    expect(calls[0]).toBe("https://burak.mulayim.app");
    expect(calls[1]).toContain("api.websitecarbon.com/data");
    expect(calls[1]).toContain("bytes=12345");
    expect(calls[1]).toContain("green=1");
    expect(result.url).toBe("https://burak.mulayim.app");
    expect(result.bytes).toBe(12345);
    expect(result.adjusted_bytes).toBe(9319.68);
    expect(result.gco2e).toBe(0.00557);
    expect(result.cleanerThan).toBe(0.99);
    expect(result.co2.renewable.grams).toBe(0.0055);
  });

  it("encodes green=0 when not green-hosted", async () => {
    let dataUrl = "";
    const fetch = (async (input: string | URL | Request): Promise<Response> => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/data")) dataUrl = url;
      return makeFetch({ pageBytes: 1 })(input as Parameters<typeof globalThis.fetch>[0]);
    }) as typeof globalThis.fetch;

    await carbonFetcher({ url: "https://example.com", green: false, fetch })();
    expect(dataUrl).toContain("green=0");
  });

  it("throws when the page fetch fails", async () => {
    const fetch = makeFetch({ pageBytes: 0, pageStatus: 500 });
    const fn = carbonFetcher({ url: "https://example.com", green: true, fetch });
    await expect(fn()).rejects.toThrow();
  });

  it("throws when /data fails", async () => {
    const fetch = makeFetch({ pageBytes: 100, dataStatus: 503 });
    const fn = carbonFetcher({ url: "https://example.com", green: true, fetch });
    await expect(fn()).rejects.toThrow(/websitecarbon 503/u);
  });
});
