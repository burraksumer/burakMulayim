import { describe, expect, it } from "bun:test";

import { canonicalTagPath, tagPath } from "./tag";

describe("tagPath", () => {
  it("builds the canonical /tags/<slug> path", () => {
    expect(tagPath("technology")).toBe("/tags/technology");
    expect(tagPath("letters-of-barbara-a-i")).toBe("/tags/letters-of-barbara-a-i");
  });
});

describe("canonicalTagPath", () => {
  it("returns null when input is already canonical (no redirect needed)", () => {
    expect(canonicalTagPath("technology", "technology")).toBeNull();
  });

  it("returns the canonical path when input differs", () => {
    expect(canonicalTagPath("Technology", "technology")).toBe("/tags/technology");
    expect(canonicalTagPath("TECHNOLOGY", "technology")).toBe("/tags/technology");
    expect(canonicalTagPath("Letters of Barbara (A.I.)", "letters-of-barbara-a-i")).toBe(
      "/tags/letters-of-barbara-a-i",
    );
  });

  it("returns null when canonicalSlug is empty (defensive)", () => {
    expect(canonicalTagPath("anything", "")).toBeNull();
  });
});
