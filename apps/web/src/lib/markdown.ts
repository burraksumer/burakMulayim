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

function isExternal(href: string): boolean {
  // http(s) URLs are external. mailto:/tel:/etc. open an OS handler — not a
  // page swap — so the same-tab vs new-tab choice doesn't apply there.
  // Fragment/relative/absolute-path URLs are all internal navigation.
  return /^https?:\/\//i.test(href);
}

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
      const externalAttrs = isExternal(href) ? ` target="_blank" rel="noopener noreferrer"` : "";
      return `<a href="${href}"${titleAttr}${externalAttrs}>${text}</a>`;
    },
  },
});

export function renderMarkdown(body: string): Promise<string> {
  return Promise.resolve(marked.parse(body));
}
