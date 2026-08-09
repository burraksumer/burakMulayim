import { marked } from "marked";

// Centralized markdown rendering for both /posts/[slug] and /now.
// Previously each page configured marked locally and the two had drifted
// (slug page set `breaks: false`, now page used defaults). Single source of
// truth here, used everywhere.
//
// The custom link renderer is the meaningful addition: external links get
// `target="_blank"` + `rel="noopener noreferrer"` so readers don't lose the
// page when they click off to a reference. Internal links (relative paths,
// fragment anchors) keep the normal same-tab behavior so site navigation
// doesn't fragment into a dozen open tabs.
//
// `marked.use` mutates the global marked singleton. We run it once at module
// load; subsequent imports see the same configured instance.

// Two separate concerns: which arrow to draw, and whether to add
// target="_blank" + rel="noopener noreferrer". They mostly overlap but
// mailto:/tel:/sms: split them — they're "external" semantically (the
// arrow says so) but they open an OS handler, not another tab, so
// target=_blank is wrong / no-op there.
function isExternalArrow(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|sms:)/i.test(href);
}
function isNewTabExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

// Arrow markup mirrors the Link.astro component so links in markdown
// bodies (post content, /now content) match the chrome links elsewhere on
// the site. The `group/link` class on the anchor pairs with
// `group-hover/link:` on the arrow span — hovering the link flips the
// arrow to the warm accent. If Link.astro's arrow markup changes, change
// it here too.
const INTERNAL_ARROW = `<span class="text-ink-3 group-hover/link:text-ink-accent ml-1 font-mono text-xs" aria-hidden="true">→</span>`;
const EXTERNAL_ARROW = `<span class="text-ink-3 group-hover/link:text-ink-accent ml-0.5 align-super font-mono text-[10px]" aria-hidden="true">↗</span>`;

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    link({ href, title, tokens }) {
      // parseInline is what marked normally does for link contents; preserve
      // that so nested markdown (bold, code, etc.) inside link text still
      // renders correctly.
      const text = this.parser.parseInline(tokens);
      const titleAttr = title ? ` title="${title}"` : "";
      const newTabAttrs = isNewTabExternal(href)
        ? ` target="_blank" rel="noopener noreferrer"`
        : "";
      // Mirrors Link.astro's Umami attributes so links inside post bodies are
      // tracked the same as chrome links. External only — internal links are
      // already counted as pageviews.
      const trackingAttrs = isExternalArrow(href)
        ? ` data-umami-event="external-link" data-umami-event-href="${href}"`
        : "";
      const arrow = isExternalArrow(href) ? EXTERNAL_ARROW : INTERNAL_ARROW;
      return `<a href="${href}"${titleAttr}${newTabAttrs}${trackingAttrs} class="group/link">${text}${arrow}</a>`;
    },
  },
});

export function renderMarkdown(body: string): Promise<string> {
  return Promise.resolve(marked.parse(body));
}
