import type { DbClient } from "@burakMulayim/db";
import { eq, schema } from "@burakMulayim/db";

export type Fetcher<T> = () => Promise<T>;

export interface CacheEntry<T> {
  value: T;
  fetched_at: Date;
  last_success_at: Date;
  stale: boolean;
}

export interface CacheOptions<T> {
  key: string;
  ttlMs: number;
  fetcher: Fetcher<T>;
  now?: () => number;
  logger?: { warn(msg: string, err: unknown): void };
}

interface StoredValue<T> {
  value: T;
  was_success: boolean;
}

export class Cache {
  constructor(private db: DbClient) {}

  private read<T>(
    key: string,
  ): { row: typeof schema.upstreamCache.$inferSelect; stored: StoredValue<T> } | null {
    const rows = this.db.drizzle
      .select()
      .from(schema.upstreamCache)
      .where(eq(schema.upstreamCache.key, key))
      .all();
    const row = rows[0];
    if (!row) return null;
    return { row, stored: row.value as StoredValue<T> };
  }

  private write<T>(key: string, stored: StoredValue<T>, fetchedAt: Date, lastSuccessAt: Date) {
    this.db.drizzle
      .insert(schema.upstreamCache)
      .values({
        key,
        value: stored,
        fetchedAt,
        lastSuccessAt,
      })
      .onConflictDoUpdate({
        target: schema.upstreamCache.key,
        set: {
          value: stored,
          fetchedAt,
          lastSuccessAt,
        },
      })
      .run();
  }

  /**
   * Fetch-with-stale-fallback. If a fresh entry exists (within ttlMs), returns it.
   * Otherwise tries to refresh via the fetcher; on failure, returns the last
   * successful value (marked stale) instead of throwing.
   */
  async get<T>(opts: CacheOptions<T>): Promise<CacheEntry<T> | null> {
    const now = opts.now?.() ?? Date.now();
    const existing = this.read<T>(opts.key);

    if (existing) {
      const age = now - existing.row.fetchedAt.getTime();
      if (existing.stored.was_success && age < opts.ttlMs) {
        return {
          value: existing.stored.value,
          fetched_at: existing.row.fetchedAt,
          last_success_at: existing.row.lastSuccessAt,
          stale: false,
        };
      }
    }

    try {
      const fresh = await opts.fetcher();
      const fetchedAt = new Date(now);
      this.write<T>(opts.key, { value: fresh, was_success: true }, fetchedAt, fetchedAt);
      return { value: fresh, fetched_at: fetchedAt, last_success_at: fetchedAt, stale: false };
    } catch (err) {
      opts.logger?.warn(`cache refresh failed for key=${opts.key}`, err);
      if (existing) {
        // Bump fetched_at so we record the attempt, but preserve last_success_at and value.
        const fetchedAt = new Date(now);
        this.write<T>(
          opts.key,
          { value: existing.stored.value, was_success: false },
          fetchedAt,
          existing.row.lastSuccessAt,
        );
        return {
          value: existing.stored.value,
          fetched_at: fetchedAt,
          last_success_at: existing.row.lastSuccessAt,
          stale: true,
        };
      }
      return null;
    }
  }
}
