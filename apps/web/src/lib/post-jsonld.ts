import type { Post } from "@burakmulayim/shared";

// Schema.org BlogPosting builder. Used by posts/[slug].astro to embed
// structured-data alongside the rendered page, so Google / Bing / etc. can
// render rich SERP snippets (date stamp, author byline, thumbnail).
//
// We don't track a separate "modified time" in post frontmatter — posts are
// either current or rewritten with a new date, so datePublished and
// dateModified are intentionally the same. If you ever start tracking
// `updated_at` separately, plumb it through here.

export interface JsonLdSiteConfig {
  /**
   * Site origin used to build absolute URLs (BlogPosting requires absolute
   * `url`, `image`, and `@id`). Typically `Astro.site.href` or the apex
   * domain string.
   */
  siteUrl: string;
  /** Author display name (falls back when a post doesn't override). */
  authorName: string;
  /**
   * Author profile URL (links the author entity to a real place on the web).
   * Optional — emitted only when set.
   */
  authorUrl?: string;
}

/** Shape of the BlogPosting object — typed so consumers can't misspell keys. */
export interface ArticleJsonLd {
  "@context": "https://schema.org";
  "@type": "BlogPosting";
  headline: string;
  datePublished: string;
  dateModified: string;
  author: Person;
  publisher: Person;
  url: string;
  image: string;
  description: string;
  keywords: string[];
  mainEntityOfPage: {
    "@type": "WebPage";
    "@id": string;
  };
}

interface Person {
  "@type": "Person";
  name: string;
  url?: string;
}

function person(name: string, url: string | undefined): Person {
  // Omit `url` entirely when not set so the JSON stays minimal. Schema.org
  // treats absent properties identically to undefined ones.
  return url ? { "@type": "Person", name, url } : { "@type": "Person", name };
}

export function buildArticleJsonLd(post: Post, site: JsonLdSiteConfig): ArticleJsonLd {
  const postUrl = new URL(`posts/${post.slug}`, site.siteUrl).href;
  const imageUrl = new URL(`og/${post.slug}.png`, site.siteUrl).href;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.date,
    dateModified: post.date,
    author: person(post.author ?? site.authorName, site.authorUrl),
    publisher: person(site.authorName, site.authorUrl),
    url: postUrl,
    image: imageUrl,
    description: post.description ?? post.excerpt,
    keywords: post.tags,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl,
    },
  };
}
