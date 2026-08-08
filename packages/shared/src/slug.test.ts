import { describe, expect, it } from "bun:test";

import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases ASCII letters", () => {
    expect(slugify("Technology")).toBe("technology");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("Web Browsers")).toBe("web-browsers");
  });

  it("collapses runs of non-alphanumeric chars into a single hyphen", () => {
    expect(slugify("Letters of Barbara (A.I.)")).toBe("letters-of-barbara-a-i");
  });

  it("strips combining marks (accents)", () => {
    expect(slugify("café")).toBe("cafe");
    expect(slugify("Burak Sümer")).toBe("burak-sumer");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  hello  ")).toBe("hello");
    expect(slugify("---abc---")).toBe("abc");
  });

  it("is idempotent (slugify(slugify(x)) === slugify(x))", () => {
    const inputs = ["Technology", "Letters of Barbara (A.I.)", "Burak Sümer", "C++ Tips"];
    for (const x of inputs) {
      expect(slugify(slugify(x))).toBe(slugify(x));
    }
  });

  it("returns empty string for inputs with no alphanumerics", () => {
    expect(slugify("")).toBe("");
    expect(slugify("---")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});
