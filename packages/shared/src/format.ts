/**
 * Display formatters used in both server-rendered HTML and frontend pages.
 * Pure functions — no platform-specific APIs.
 */

/** ISO date → "2024.02.07" — mono-friendly, locale-independent, sorts as text. */
export function fmtDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, ".");
}

/** ISO date → "February 7, 2024" — for prose-like contexts. */
export function fmtLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * ISO datetime → "5m ago", "3h ago", "12d ago", or "just now".
 * Empty string when input is undefined (caller-friendly default).
 */
export function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
