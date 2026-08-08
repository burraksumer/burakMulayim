import { Database } from "bun:sqlite";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { drizzle } from "drizzle-orm/bun-sqlite";

import { migrate } from "./migrate";
import * as schema from "./schema";

export type Drizzle = ReturnType<typeof drizzle<typeof schema>>;

export interface DbClient {
  drizzle: Drizzle;
  sqlite: Database;
}

export interface CreateDbOptions {
  url?: string;
  /** Run migrations on the new DB. Default `true`. */
  migrate?: boolean;
  /**
   * Override the migrations folder. Default: auto-resolved to
   * `packages/db/src/migrations/` via Node module resolution. Useful for
   * tests that want to point at a fixture folder or skip discovery.
   */
  migrationsFolder?: string;
}

// Resolve the migrations folder lazily so tests can override before this
// runs. Uses createRequire to find @burakmulayim/db's package.json — which
// is THIS package — then walks to the sibling `src/migrations` folder.
// Works in dev (import.meta.url points at packages/db/src/index.ts) AND in
// production (the bundled server's createRequire still resolves via the
// workspace-symlinked node_modules tree).
function defaultMigrationsFolder(): string {
  const require = createRequire(import.meta.url);
  const pkgJson = require.resolve("@burakmulayim/db/package.json");
  return resolve(dirname(pkgJson), "src/migrations");
}

export function createDb(options: CreateDbOptions = {}): DbClient {
  const sqlite = new Database(options.url ?? ":memory:", { create: true });
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA synchronous = NORMAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  if (options.migrate !== false) {
    const folder = options.migrationsFolder ?? defaultMigrationsFolder();
    migrate(sqlite, folder);
  }
  return { drizzle: drizzle(sqlite, { schema }), sqlite };
}

export { schema, migrate };
export { eq, and, or, sql, desc, asc } from "drizzle-orm";
