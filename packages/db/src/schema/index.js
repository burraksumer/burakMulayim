import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const upstreamCache = sqliteTable("upstream_cache", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  fetchedAt: integer("fetched_at", { mode: "timestamp_ms" }).notNull(),
  lastSuccessAt: integer("last_success_at", { mode: "timestamp_ms" }).notNull(),
  lastChangedAt: integer("last_changed_at", { mode: "timestamp_ms" }).notNull(),
});
