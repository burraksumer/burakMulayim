import { beforeEach, describe, expect, it, mock } from "bun:test";

import { createDb, type DbClient } from "@burakMulayim/db";

import { Cache } from "./index";

let db: DbClient;
let cache: Cache;

beforeEach(() => {
  db = createDb();
  cache = new Cache(db);
});

describe("Cache", () => {
  it("returns null when fetcher fails and no prior value exists", async () => {
    const fetcher = mock(async () => {
      throw new Error("503");
    });
    const entry = await cache.get({ key: "x", ttlMs: 1000, fetcher });
    expect(entry).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fetches and stores a fresh value", async () => {
    const fetcher = mock(async () => ({ score: 42 }));
    const entry = await cache.get({ key: "x", ttlMs: 1000, fetcher, now: () => 100 });
    expect(entry).not.toBeNull();
    expect(entry!.value).toEqual({ score: 42 });
    expect(entry!.stale).toBe(false);
    expect(entry!.fetched_at.getTime()).toBe(100);
    expect(entry!.last_success_at.getTime()).toBe(100);
    expect(entry!.last_changed_at.getTime()).toBe(100);
  });

  it("preserves last_changed_at when refetched value is identical", async () => {
    const fetcher = async () => ({ score: 42 });
    await cache.get({ key: "x", ttlMs: 0, fetcher, now: () => 100 });
    const second = await cache.get({ key: "x", ttlMs: 0, fetcher, now: () => 5000 });
    expect(second!.fetched_at.getTime()).toBe(5000);
    expect(second!.last_success_at.getTime()).toBe(5000);
    expect(second!.last_changed_at.getTime()).toBe(100); // unchanged
  });

  it("bumps last_changed_at when refetched value differs", async () => {
    let v = 1;
    const fetcher = async () => ({ score: v });
    await cache.get({ key: "x", ttlMs: 0, fetcher, now: () => 100 });
    v = 2;
    const second = await cache.get({ key: "x", ttlMs: 0, fetcher, now: () => 5000 });
    expect(second!.value).toEqual({ score: 2 });
    expect(second!.last_changed_at.getTime()).toBe(5000);
  });

  it("preserves last_changed_at across upstream failures", async () => {
    let mode: "good" | "fail" = "good";
    const fetcher = async () => {
      if (mode === "fail") throw new Error("503");
      return { score: 1 };
    };
    await cache.get({ key: "x", ttlMs: 0, fetcher, now: () => 100 });
    mode = "fail";
    const stale = await cache.get({ key: "x", ttlMs: 0, fetcher, now: () => 9999 });
    expect(stale!.stale).toBe(true);
    expect(stale!.last_changed_at.getTime()).toBe(100);
  });

  it("serves last-good value when upstream fails after a prior success", async () => {
    let mode: "good" | "fail" = "good";
    const fetcher = mock(async () => {
      if (mode === "fail") throw new Error("503");
      return { score: 42 };
    });

    await cache.get({ key: "x", ttlMs: 1000, fetcher, now: () => 100 });
    mode = "fail";
    const stale = await cache.get({ key: "x", ttlMs: 1000, fetcher, now: () => 5000 });

    expect(stale).not.toBeNull();
    expect(stale!.value).toEqual({ score: 42 });
    expect(stale!.stale).toBe(true);
    expect(stale!.last_success_at.getTime()).toBe(100);
    expect(stale!.fetched_at.getTime()).toBe(5000);
  });

  it("preserves last_success_at across multiple consecutive failures", async () => {
    let mode: "good" | "fail" = "good";
    const fetcher = async () => {
      if (mode === "fail") throw new Error("503");
      return { score: 1 };
    };

    await cache.get({ key: "x", ttlMs: 100, fetcher, now: () => 100 });
    mode = "fail";
    await cache.get({ key: "x", ttlMs: 100, fetcher, now: () => 1000 });
    const third = await cache.get({ key: "x", ttlMs: 100, fetcher, now: () => 9999 });

    expect(third!.last_success_at.getTime()).toBe(100);
    expect(third!.fetched_at.getTime()).toBe(9999);
    expect(third!.stale).toBe(true);
    expect(third!.value).toEqual({ score: 1 });
  });

  it("recovers from stale to fresh when upstream returns 200 again", async () => {
    let mode: "good" | "fail" | "good2" = "good";
    const fetcher = async () => {
      if (mode === "fail") throw new Error("503");
      return mode === "good" ? { v: 1 } : { v: 2 };
    };

    await cache.get({ key: "x", ttlMs: 100, fetcher, now: () => 100 });
    mode = "fail";
    await cache.get({ key: "x", ttlMs: 100, fetcher, now: () => 500 });
    mode = "good2";
    const fresh = await cache.get({ key: "x", ttlMs: 100, fetcher, now: () => 1000 });

    expect(fresh!.value).toEqual({ v: 2 });
    expect(fresh!.stale).toBe(false);
    expect(fresh!.last_success_at.getTime()).toBe(1000);
  });

  it("does not call fetcher when entry is fresh within TTL", async () => {
    const fetcher = mock(async () => ({ v: 1 }));
    await cache.get({ key: "x", ttlMs: 1000, fetcher, now: () => 100 });
    await cache.get({ key: "x", ttlMs: 1000, fetcher, now: () => 500 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("re-fetches once TTL has elapsed", async () => {
    const fetcher = mock(async () => ({ v: 1 }));
    await cache.get({ key: "x", ttlMs: 1000, fetcher, now: () => 100 });
    await cache.get({ key: "x", ttlMs: 1000, fetcher, now: () => 2000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
