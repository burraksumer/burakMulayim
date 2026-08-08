/**
 * Tag URL helpers — shared between server and client so canonical-URL logic
 * has one source of truth.
 */

/**
 * The canonical URL path for a tag, given its canonical (lowercase, slugified)
 * form. Centralized so callers can't accidentally generate `/tags/${slug}`
 * with a typo or stale prefix elsewhere.
 */
export function tagPath(canonicalSlug: string): string {
  return `/tags/${canonicalSlug}`;
}

/**
 * Decide whether a request to `/tags/<input>` should be redirected to its
 * canonical form. Returns the canonical path to redirect to, or `null` if
 * the input is already canonical (no redirect needed).
 */
export function canonicalTagPath(input: string, canonicalSlug: string): string | null {
  if (!canonicalSlug) return null;
  return input === canonicalSlug ? null : tagPath(canonicalSlug);
}
