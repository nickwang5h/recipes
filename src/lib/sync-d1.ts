// The family store on Cloudflare D1: one row per family. A conditional write is a single
// statement, so two devices syncing at once cannot both win.
//   CREATE TABLE families (key TEXT PRIMARY KEY, data TEXT NOT NULL, etag TEXT NOT NULL)
import type { BlobStore } from './sync-server';

/** The slice of the D1 binding this store uses. */
export interface D1 {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      run(): Promise<{ meta: { changes: number } }>;
    };
  };
}

export function d1Store(db: D1): BlobStore {
  return {
    async getWithMetadata(key) {
      const row = await db.prepare('SELECT data, etag FROM families WHERE key = ?').bind(key).first<{ data: string; etag: string }>();
      return row ? { data: JSON.parse(row.data), etag: row.etag } : null;
    },
    async setJSON(key, data, options = {}) {
      const etag = crypto.randomUUID();
      const text = JSON.stringify(data);
      const statement = options.onlyIfMatch
        ? db.prepare('UPDATE families SET data = ?, etag = ? WHERE key = ? AND etag = ?').bind(text, etag, key, options.onlyIfMatch)
        : options.onlyIfNew
          ? db.prepare('INSERT INTO families (key, data, etag) VALUES (?, ?, ?) ON CONFLICT(key) DO NOTHING').bind(key, text, etag)
          : db.prepare('INSERT INTO families (key, data, etag) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data, etag = excluded.etag').bind(key, text, etag);
      const result = await statement.run();
      return { modified: result.meta.changes === 1 };
    },
  };
}
