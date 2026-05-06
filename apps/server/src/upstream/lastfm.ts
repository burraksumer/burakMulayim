import type { LastfmTrack } from "@burakmulayim/shared";

export interface LastfmFetcherDeps {
  user: string;
  apiKey?: string;
  limit?: number;
  fetch?: typeof globalThis.fetch;
}

interface LastfmApiTrack {
  name: string;
  artist: { "#text": string };
  album?: { "#text": string };
  url: string;
  image?: Array<{ "#text": string; size: string }>;
  date?: { uts: string };
  "@attr"?: { nowplaying?: string };
}

interface LastfmApiResponse {
  recenttracks?: { track: LastfmApiTrack[] | LastfmApiTrack };
}

function pickImage(images?: Array<{ "#text": string; size: string }>): string | undefined {
  if (!images) return undefined;
  const large = images.find((i) => i.size === "large") ?? images.at(-1);
  const url = large?.["#text"];
  return url && url.length > 0 ? url : undefined;
}

export function lastfmFetcher({
  user,
  apiKey,
  limit = 10,
  fetch = globalThis.fetch,
}: LastfmFetcherDeps) {
  return async (): Promise<{ user: string; tracks: LastfmTrack[] }> => {
    if (!apiKey) throw new Error("LASTFM_API_KEY missing");
    const api = new URL("https://ws.audioscrobbler.com/2.0/");
    api.searchParams.set("method", "user.getrecenttracks");
    api.searchParams.set("user", user);
    api.searchParams.set("api_key", apiKey);
    api.searchParams.set("format", "json");
    api.searchParams.set("limit", String(limit));

    const res = await fetch(api.toString(), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`lastfm ${res.status}`);
    const body = (await res.json()) as LastfmApiResponse;
    const raw = body.recenttracks?.track ?? [];
    const arr = Array.isArray(raw) ? raw : [raw];

    const tracks: LastfmTrack[] = arr.map((t) => ({
      name: t.name,
      artist: t.artist["#text"],
      album: t.album?.["#text"] || undefined,
      url: t.url,
      image: pickImage(t.image),
      played_at: t.date ? new Date(Number(t.date.uts) * 1000).toISOString() : undefined,
      now_playing: t["@attr"]?.nowplaying === "true",
    }));

    return { user, tracks };
  };
}
