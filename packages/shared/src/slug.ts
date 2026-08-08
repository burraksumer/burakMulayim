/**
 * Convert a string into a URL-safe slug.
 *
 * Steps:
 *  1. Lowercase
 *  2. NFKD-normalize and strip combining marks (so "café" → "cafe")
 *  3. Replace any run of non-alphanumeric characters with a single hyphen
 *  4. Trim leading/trailing hyphens
 *
 * Stable, idempotent: `slugify(slugify(x)) === slugify(x)`.
 *
 * Used by both server (canonical tag matching, generating slugs at boot)
 * and client (generating canonical /tags/<slug> URLs without redirects).
 * Single source of truth — keep it here.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
