import type { Database } from "bun:sqlite";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS upstream_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  last_success_at INTEGER NOT NULL,
  last_changed_at INTEGER NOT NULL DEFAULT 0
);

CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  slug UNINDEXED,
  title,
  body,
  tags,
  tokenize = 'porter unicode61'
);
`;

interface ColumnInfo {
  name: string;
}

export function migrate(sqlite: Database) {
  sqlite.exec(SCHEMA_SQL);

  // Backfill column for databases created before last_changed_at existed.
  const cols = sqlite.query<ColumnInfo, []>("PRAGMA table_info(upstream_cache)").all();
  if (!cols.some((c) => c.name === "last_changed_at")) {
    sqlite.exec(
      "ALTER TABLE upstream_cache ADD COLUMN last_changed_at INTEGER NOT NULL DEFAULT 0;",
    );
  }
}
