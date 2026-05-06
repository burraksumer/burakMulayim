import { stat, readFile } from "node:fs/promises";
import { join } from "node:path";

import { Elysia } from "elysia";

export interface NowRouteDeps {
  /** Directory holding the markdown content (typically apps/server/content). */
  contentDir: string;
  /** Filename within `contentDir` to serve. Defaults to "now.md". */
  filename?: string;
}

/** Strip the inline markdown a short headline is likely to contain. */
function stripInlineMarkdown(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/__([^_]+)__/gu, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/gu, "$1")
    .replace(/(?<!_)_([^_]+)_(?!_)/gu, "$1")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .trim();
}

/**
 * Common subject/detail separators in short one-liners. Matched in
 * earliest-occurrence order. Period is excluded because URLs contain dots;
 * comma is excluded because it's a clause separator more often than a
 * "subject, detail" one. Spaces around the dashes/hyphen prevent false
 * matches inside hyphenated words like "burak.mulayim.app/foo-bar".
 */
const HEADLINE_SEPARATORS = [" — ", " – ", " - ", ": "];

function earliestSeparator(s: string): number {
  let earliest = -1;
  for (const sep of HEADLINE_SEPARATORS) {
    const idx = s.indexOf(sep);
    if (idx > 2 && (earliest === -1 || idx < earliest)) earliest = idx;
  }
  return earliest;
}

/**
 * Extract a one-line headline from the markdown body.
 *
 * Strategy: take the first list item, strip inline formatting, and if it
 * contains a "subject {separator} detail" pattern, return only the subject.
 * Falls back to the whole bullet. Returns undefined when no list item exists.
 */
export function extractHeadline(body: string): string | undefined {
  for (const line of body.split("\n")) {
    const match = line.trim().match(/^[-*+]\s+(.+)$/u);
    if (!match) continue;
    const stripped = stripInlineMarkdown(match[1]!);
    const splitIdx = earliestSeparator(stripped);
    if (splitIdx > 2) return stripped.slice(0, splitIdx).trim();
    return stripped;
  }
  return undefined;
}

export function nowRoutes({ contentDir, filename = "now.md" }: NowRouteDeps) {
  const filepath = join(contentDir, filename);

  return new Elysia().get("/now", async ({ status }) => {
    try {
      const [body, fileStat] = await Promise.all([readFile(filepath, "utf8"), stat(filepath)]);
      const trimmed = body.trim();
      return {
        body: trimmed,
        headline: extractHeadline(trimmed),
        last_modified: fileStat.mtime.toISOString(),
      };
    } catch {
      return status(404, { error: "now.md not found" });
    }
  });
}
