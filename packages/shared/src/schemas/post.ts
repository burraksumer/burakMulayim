import { z } from "zod";

export const PostMetaSchema = z.object({
  slug: z.string(),
  title: z.string(),
  date: z.iso.date(),
  description: z.string().optional(),
  author: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()),
  draft: z.boolean(),
  excerpt: z.string(),
  reading_time: z.number().int().nonnegative(),
});

export const PostSchema = PostMetaSchema.extend({
  body: z.string(),
});

export const PostListSchema = z.array(PostMetaSchema);

export const TagSchema = z.object({
  tag: z.string(),
  count: z.number().int().nonnegative(),
});

export const TagListSchema = z.array(TagSchema);

export const SearchHitSchema = PostMetaSchema.extend({
  score: z.number(),
  snippet: z.string(),
});

export const SearchResultSchema = z.object({
  query: z.string(),
  hits: z.array(SearchHitSchema),
});

export type PostMeta = z.infer<typeof PostMetaSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type SearchHit = z.infer<typeof SearchHitSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
