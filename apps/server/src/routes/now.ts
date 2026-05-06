import { stat, readFile } from "node:fs/promises";
import { join } from "node:path";

import { Elysia } from "elysia";

import { extractHeadline } from "@burakmulayim/shared";

export interface NowRouteDeps {
  /** Directory holding the markdown content (typically apps/server/content). */
  contentDir: string;
  /** Filename within `contentDir` to serve. Defaults to "now.md". */
  filename?: string;
}

export function nowRoutes({ contentDir, filename = "now.md" }: NowRouteDeps) {
  const filepath = join(contentDir, filename);

  return new Elysia().get("/now", async ({ status }) => {
    try {
      const [body, fileStat] = await Promise.all([readFile(filepath, "utf8"), stat(filepath)]);
      const trimmed = body.trim();
      return {
        body: trimmed,
        headline: extractHeadline(trimmed),
        last_modified: fileStat.mtime.toISOString(),
      };
    } catch {
      return status(404, { error: "now.md not found" });
    }
  });
}
