import type { Carbon } from "@burakMulayim/shared";

export interface CarbonFetcherDeps {
  url: string;
  green: boolean;
  fetch?: typeof globalThis.fetch;
}

interface CarbonDataResponse {
  bytes: number;
  green: boolean;
  gco2e: number;
  rating: string;
  cleanerThan: number;
  statistics: {
    adjustedBytes: number;
    energy: number;
    co2: {
      grid: { grams: number; litres: number };
      renewable: { grams: number; litres: number };
    };
  };
}

type CarbonValue = Omit<Carbon, "fetched_at" | "last_success_at" | "last_changed_at" | "stale">;

async function measureBytes(url: string, fetch: typeof globalThis.fetch): Promise<number> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`measure ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  return buf.byteLength;
}

export function carbonFetcher({ url, green, fetch = globalThis.fetch }: CarbonFetcherDeps) {
  return async (): Promise<CarbonValue> => {
    const bytes = await measureBytes(url, fetch);
    const api = new URL("https://api.websitecarbon.com/data");
    api.searchParams.set("bytes", String(bytes));
    api.searchParams.set("green", green ? "1" : "0");
    const res = await fetch(api.toString(), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`websitecarbon ${res.status}`);
    const body = (await res.json()) as CarbonDataResponse;
    return {
      url,
      green: body.green,
      bytes: body.bytes,
      adjusted_bytes: body.statistics.adjustedBytes,
      energy: body.statistics.energy,
      gco2e: body.gco2e,
      cleanerThan: body.cleanerThan,
      rating: body.rating,
      co2: {
        grid: body.statistics.co2.grid,
        renewable: body.statistics.co2.renewable,
      },
    };
  };
}
