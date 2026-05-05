import { Database } from "bun:sqlite";
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
  migrate?: boolean;
}

export function createDb(options: CreateDbOptions = {}): DbClient {
  const sqlite = new Database(options.url ?? ":memory:", { create: true });
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA synchronous = NORMAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  if (options.migrate !== false) {
    migrate(sqlite);
  }
  return { drizzle: drizzle(sqlite, { schema }), sqlite };
}

export { schema, migrate };
export { eq, and, or, sql, desc, asc } from "drizzle-orm";
