import type { Database } from "bun:sqlite";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS upstream_cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  last_success_at INTEGER NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5(
  slug UNINDEXED,
  title,
  body,
  tags,
  tokenize = 'porter unicode61'
);
`;

export function migrate(sqlite: Database) {
  sqlite.exec(SCHEMA_SQL);
}
