-- One merged sync doc per family, keyed by a hash of the family code (src/lib/sync-server.ts).
CREATE TABLE families (key TEXT PRIMARY KEY, data TEXT NOT NULL, etag TEXT NOT NULL);
