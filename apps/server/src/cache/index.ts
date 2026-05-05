import type { DbClient } from "@burakMulayim/db";
import { eq, schema } from "@burakMulayim/db";

export type Fetcher<T> = () => Promise<T>;

export interface CacheEntry<T> {
  value: T;
  fetched_at: Date;
  last_success_at: Date;
  last_changed_at: Date;
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

function valuesEqual<T>(a: T, b: T): boolean {
  // Stable enough for our cache values: we always assemble objects with the
  // same key order, so JSON encoding produces byte-identical strings when the
  // logical content matches.
  return JSON.stringify(a) === JSON.stringify(b);
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

  private write<T>(
    key: string,
    stored: StoredValue<T>,
    fetchedAt: Date,
    lastSuccessAt: Date,
    lastChangedAt: Date,
  ) {
    this.db.drizzle
      .insert(schema.upstreamCache)
      .values({
        key,
        value: stored,
        fetchedAt,
        lastSuccessAt,
        lastChangedAt,
      })
      .onConflictDoUpdate({
        target: schema.upstreamCache.key,
        set: {
          value: stored,
          fetchedAt,
          lastSuccessAt,
          lastChangedAt,
        },
      })
      .run();
  }

  /**
   * Fetch-with-stale-fallback. Within ttlMs, returns cached. Otherwise refreshes;
   * on failure, returns last good value (stale=true). last_changed_at only moves
   * when the upstream value actually differs from the prior successful value.
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
          last_changed_at: existing.row.lastChangedAt,
          stale: false,
        };
      }
    }

    try {
      const fresh = await opts.fetcher();
      const fetchedAt = new Date(now);
      const isUnchanged =
        existing?.stored.was_success === true && valuesEqual(existing.stored.value, fresh);
      const lastChangedAt = isUnchanged ? existing.row.lastChangedAt : fetchedAt;
      this.write<T>(
        opts.key,
        { value: fresh, was_success: true },
        fetchedAt,
        fetchedAt,
        lastChangedAt,
      );
      return {
        value: fresh,
        fetched_at: fetchedAt,
        last_success_at: fetchedAt,
        last_changed_at: lastChangedAt,
        stale: false,
      };
    } catch (err) {
      opts.logger?.warn(`cache refresh failed for key=${opts.key}`, err);
      if (existing) {
        // Record the failed attempt without disturbing last_success_at / last_changed_at.
        const fetchedAt = new Date(now);
        this.write<T>(
          opts.key,
          { value: existing.stored.value, was_success: false },
          fetchedAt,
          existing.row.lastSuccessAt,
          existing.row.lastChangedAt,
        );
        return {
          value: existing.stored.value,
          fetched_at: fetchedAt,
          last_success_at: existing.row.lastSuccessAt,
          last_changed_at: existing.row.lastChangedAt,
          stale: true,
        };
      }
      return null;
    }
  }
}
