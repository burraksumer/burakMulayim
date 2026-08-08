import { z } from "zod";

export const CarbonSchema = z.object({
  url: z.url(),
  green: z.boolean(),
  bytes: z.number().nonnegative(),
  adjusted_bytes: z.number().nonnegative(),
  energy: z.number().nonnegative(),
  gco2e: z.number().nonnegative(),
  cleanerThan: z.number().min(0).max(1),
  rating: z.string(),
  co2: z.object({
    grid: z.object({
      grams: z.number(),
      litres: z.number(),
    }),
    renewable: z.object({
      grams: z.number(),
      litres: z.number(),
    }),
  }),
  fetched_at: z.iso.datetime(),
  last_success_at: z.iso.datetime(),
  last_changed_at: z.iso.datetime(),
  stale: z.boolean(),
});

export type Carbon = z.infer<typeof CarbonSchema>;
