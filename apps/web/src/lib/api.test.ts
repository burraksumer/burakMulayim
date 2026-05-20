import { afterEach, beforeEach, describe, expect, it, spyOn, type Mock } from "bun:test";

import { api } from "./api";

// `api.ts` is a thin wrapper around fetch that "fails safe" — any non-2xx
// response, network error, or timeout returns null so the page can degrade
// gracefully. These tests exercise each failure mode + the happy path. We
// spy on `fetch` rather than booting a real server so the suite is fast and
// hermetic.

let fetchSpy: Mock<typeof fetch>;

beforeEach(() => {
  fetchSpy = spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
});

function mockJsonResponse<T>(body: T, status = 200): void {
  fetchSpy.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("api.posts", () => {
  it("returns the parsed list on a 200 response", async () => {
    // `as unknown` — we deliberately ship a partial shape; the api client
    // doesn't validate, just casts. Real validation lives server-side via
    // PostListSchema. This test verifies "fetch → JSON.parse → return".
    mockJsonResponse([{ slug: "hello", title: "Hello", date: "2026-01-01" }] as unknown);
    const result = await api.posts();
    expect(result).toEqual([{ slug: "hello", title: "Hello", date: "2026-01-01" }] as never);
  });

  it("returns null on a 5xx response", async () => {
    mockJsonResponse({}, 500);
    expect(await api.posts()).toBeNull();
  });

  it("returns null on a 4xx response", async () => {
    mockJsonResponse({}, 404);
    expect(await api.posts()).toBeNull();
  });

  it("returns null when fetch throws (network unreachable)", async () => {
    fetchSpy.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await api.posts()).toBeNull();
  });
});

describe("api.post(slug)", () => {
  it("URL-encodes the slug so unusual characters don't break the request", async () => {
    mockJsonResponse({ slug: "letter 1", title: "Letter" });
    await api.post("letter 1");
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/posts/letter%201");
  });
});

describe("api.tag(name)", () => {
  it("URL-encodes the tag name (handles slashes, spaces, etc.)", async () => {
    mockJsonResponse({ tag: "Letters of Barbara (A.I.)", slug: "letters", posts: [] });
    await api.tag("Letters of Barbara (A.I.)");
    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain("/tags/Letters%20of%20Barbara%20(A.I.)");
  });
});

describe("safeJson failure modes (applied uniformly across endpoints)", () => {
  // Each endpoint runs through the same safeJson() helper, so verifying one
  // confirms the contract for all. Using api.now() as a representative call.

  it("returns null on aborted fetch (timeout path)", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    fetchSpy.mockRejectedValue(abortError);
    expect(await api.now()).toBeNull();
  });

  it("returns null when JSON parsing fails", async () => {
    fetchSpy.mockResolvedValue(
      new Response("not json at all", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );
    expect(await api.now()).toBeNull();
  });
});
