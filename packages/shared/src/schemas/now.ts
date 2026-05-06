import { z } from "zod";

export const NowSchema = z.object({
  body: z.string(),
  /** First list item, with " — detail" stripped — used as a homepage headline. */
  headline: z.string().optional(),
  last_modified: z.iso.datetime(),
});

export type Now = z.infer<typeof NowSchema>;
