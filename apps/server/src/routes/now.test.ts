import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NowSchema } from "@burakmulayim/shared";

import { extractHeadline, nowRoutes } from "./now";

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), "now-test-"));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const app = (filename = "now.md") => nowRoutes({ contentDir: tmp, filename }).compile();

describe("extractHeadline", () => {
  it("strips bold around the subject", () => {
    expect(extractHeadline("- **Building** stuff — a description.")).toBe("Building stuff");
  });
  it("returns the whole bullet when no separator is present", () => {
    expect(extractHeadline("- Just a single short item")).toBe("Just a single short item");
  });
  it("ignores headings before the first bullet", () => {
    expect(extractHeadline("## Heading\n\n- First bullet — detail")).toBe("First bullet");
  });
  it("strips link syntax", () => {
    expect(extractHeadline("- [burak.mulayim.app](https://burak.mulayim.app) — site")).toBe(
      "burak.mulayim.app",
    );
  });
  it("splits on en dash with spaces", () => {
    expect(extractHeadline("- Reading list – books for May")).toBe("Reading list");
  });
  it("splits on hyphen with spaces", () => {
    expect(extractHeadline("- Reading list - books for May")).toBe("Reading list");
  });
  it("splits on colon followed by a space", () => {
    expect(extractHeadline("- Currently: writing the next post")).toBe("Currently");
  });
  it("does not split on hyphens inside words or URLs", () => {
    expect(extractHeadline("- Visiting burak.mulayim.app/foo-bar today")).toBe(
      "Visiting burak.mulayim.app/foo-bar today",
    );
  });
  it("uses the earliest separator when multiple are present", () => {
    expect(extractHeadline("- Title: subtitle — detail")).toBe("Title");
  });
  it("returns undefined when no list item exists", () => {
    expect(extractHeadline("Just a paragraph, no bullets here.")).toBeUndefined();
  });
});

describe("GET /now", () => {
  it("returns the file body and last_modified timestamp", async () => {
    const filepath = join(tmp, "now.md");
    await writeFile(filepath, "## Hello\n\nfocus on lean software.\n", "utf8");

    const res = await app().handle(new Request("http://localhost/now"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { body: string; last_modified: string };

    expect(NowSchema.safeParse(json).success).toBe(true);
    expect(json.body).toContain("focus on lean software");
    expect(json.body).not.toMatch(/\n$/u); // trimmed
    expect(new Date(json.last_modified).getTime()).toBeGreaterThan(0);
  });

  it("returns 404 when the file is missing", async () => {
    const res = await app().handle(new Request("http://localhost/now"));
    expect(res.status).toBe(404);
  });

  it("includes a headline derived from the first list item", async () => {
    const filepath = join(tmp, "now.md");
    await writeFile(
      filepath,
      "## Currently\n\n- Building **burak.mulayim.app** — a personal site.\n- Reading more.\n",
      "utf8",
    );
    const res = await app().handle(new Request("http://localhost/now"));
    const json = (await res.json()) as { headline?: string };
    expect(json.headline).toBe("Building burak.mulayim.app");
  });

  it("reflects edits between requests (no cache)", async () => {
    const filepath = join(tmp, "now.md");
    await writeFile(filepath, "first", "utf8");

    const first = (await (await app().handle(new Request("http://localhost/now"))).json()) as {
      body: string;
    };
    expect(first.body).toBe("first");

    // Sleep so mtime changes detectably on filesystems with 1s resolution.
    await Bun.sleep(20);
    await writeFile(filepath, "second", "utf8");

    const second = (await (await app().handle(new Request("http://localhost/now"))).json()) as {
      body: string;
    };
    expect(second.body).toBe("second");
  });
});
