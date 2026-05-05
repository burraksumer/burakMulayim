import { z } from "zod";

export const LastfmTrackSchema = z.object({
  name: z.string(),
  artist: z.string(),
  album: z.string().optional(),
  url: z.url(),
  image: z.url().optional(),
  played_at: z.iso.datetime().optional(),
  now_playing: z.boolean(),
});

export const LastfmResponseSchema = z.object({
  user: z.string(),
  tracks: z.array(LastfmTrackSchema),
  fetched_at: z.iso.datetime(),
  last_success_at: z.iso.datetime(),
  stale: z.boolean(),
});

export type LastfmTrack = z.infer<typeof LastfmTrackSchema>;
export type LastfmResponse = z.infer<typeof LastfmResponseSchema>;
