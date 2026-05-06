import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1).default("./local.db"),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    WEBSITECARBON_URL: z.url().default("https://burak.mulayim.app"),
    WEBSITECARBON_GREEN: z
      .string()
      .default("true")
      .transform((v) => v.toLowerCase() === "true" || v === "1"),
    LASTFM_USER: z.string().min(1).default("buraksumer13"),
    LASTFM_API_KEY: z.string().optional(),
    POSTS_DIR: z.string().default("./content/posts"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
