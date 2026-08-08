/**
 * Pure markdown utilities shared between server (post loader, now route) and
 * any future client that needs to derive previews/headlines from raw markdown
 * (e.g. an SSH viewer, a search snippet pre-renderer, or per-page metadata).
 *
 * No platform APIs, no third-party deps — just regex on strings.
 */

const WORDS_PER_MINUTE = 220;

/** Strip the inline formatting a short headline is likely to contain. */
export function stripInlineMarkdown(s: string): string {
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
 * Extract a one-line headline from a markdown body.
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

/** Estimate reading time in minutes (rounded, minimum 1). */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Derive a short excerpt for previews. Prefers an explicit description,
 * otherwise pulls the first non-heading paragraph from the body and clamps
 * it to 280 characters. Returns "" when nothing usable is found.
 */
export function makeExcerpt(description: string | undefined, body: string): string {
  if (description && description.trim().length > 0) return description.trim();
  const firstPara = body
    .split(/\n{2,}/u)
    .map((s) => s.trim())
    .find((s) => s.length > 0 && !s.startsWith("#"));
  if (!firstPara) return "";
  const stripped = firstPara.replace(/[*_`>#]+/gu, "");
  return stripped.length <= 280 ? stripped : `${stripped.slice(0, 277).trimEnd()}...`;
}
