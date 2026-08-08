import type { Post, PostMeta } from "@burakmulayim/shared";

export interface FeedSiteConfig {
  title: string;
  description: string;
  siteUrl: string;
  feedUrl: string;
  jsonFeedUrl: string;
  author?: { name: string; url?: string };
  language?: string;
}

const xmlEscape = (s: string) =>
  s
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;");

const toRfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

const postUrl = (site: FeedSiteConfig, slug: string) =>
  new URL(`/posts/${slug}`, site.siteUrl).toString();

export function buildRss(site: FeedSiteConfig, posts: PostMeta[]): string {
  const items = posts
    .map((p) => {
      const url = postUrl(site, p.slug);
      const categories = p.tags.map((t) => `    <category>${xmlEscape(t)}</category>`).join("\n");
      return `  <item>
    <title>${xmlEscape(p.title)}</title>
    <link>${xmlEscape(url)}</link>
    <guid isPermaLink="true">${xmlEscape(url)}</guid>
    <pubDate>${toRfc822(p.date)}</pubDate>
    <description>${xmlEscape(p.excerpt)}</description>
${categories}
  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEscape(site.title)}</title>
  <link>${xmlEscape(site.siteUrl)}</link>
  <description>${xmlEscape(site.description)}</description>
  <language>${xmlEscape(site.language ?? "en")}</language>
  <atom:link href="${xmlEscape(site.feedUrl)}" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;
}

export function buildJsonFeed(site: FeedSiteConfig, posts: Post[]) {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: site.title,
    home_page_url: site.siteUrl,
    feed_url: site.jsonFeedUrl,
    description: site.description,
    language: site.language ?? "en",
    authors: site.author ? [site.author] : undefined,
    items: posts.map((p) => ({
      id: postUrl(site, p.slug),
      url: postUrl(site, p.slug),
      title: p.title,
      content_text: p.body,
      summary: p.excerpt,
      date_published: new Date(`${p.date}T00:00:00Z`).toISOString(),
      tags: p.tags,
      authors: p.author ? [{ name: p.author }] : undefined,
    })),
  };
}

export interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

export function buildSitemap(site: FeedSiteConfig, posts: PostMeta[]): string {
  const entries: SitemapEntry[] = [
    { loc: site.siteUrl },
    ...posts.map((p) => ({ loc: postUrl(site, p.slug), lastmod: p.date })),
  ];
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${xmlEscape(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${xmlEscape(e.lastmod)}</lastmod>` : ""}
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}
