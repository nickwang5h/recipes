import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { LIMITS, MAX_TIME, formatFamilyCode, invalid, merge, newFamilyCode, normalizeFamilyCode, prune, repair, tooDeep, type Doc } from '../src/lib/sync';
import { d1Store, type D1 } from '../src/lib/sync-d1';
import { handleSync, type BlobStore } from '../src/lib/sync-server';

describe('merge', () => {
  it('keeps the newer write for each key', () => {
    const phone: Doc = { 'fav:a': { v: true, t: 1 }, 'note:a': { v: '少盐', t: 5 } };
    const laptop: Doc = { 'fav:a': { v: null, t: 3 }, 'fav:b': { v: true, t: 2 } };
    expect(merge(phone, laptop)).toEqual({
      'fav:a': { v: null, t: 3 },
      'note:a': { v: '少盐', t: 5 },
      'fav:b': { v: true, t: 2 },
    });
  });

  it('agrees on ties whichever side merges first', () => {
    const a: Doc = { k: { v: 'x', t: 1 } };
    const b: Doc = { k: { v: 'y', t: 1 } };
    expect(merge(a, b)).toEqual(merge(b, a));
  });
});

describe('prune and limits', () => {
  it('drops only old tombstones', () => {
    const day = 86_400_000;
    const doc: Doc = { old: { v: null, t: 0 }, fresh: { v: null, t: 100 * day }, kept: { v: 1, t: 0 } };
    expect(Object.keys(prune(doc, 100 * day))).toEqual(['fresh', 'kept']);
  });

  it('rejects malformed entries', () => {
    expect(invalid({ k: { v: 1, t: 1 } })).toBeNull();
    expect(invalid({ k: { v: 1 } })).toMatch(/bad entry/);
    expect(invalid([])).toBe('not an object');
  });

  it('takes only write times a Date can hold', () => {
    for (const t of [0, 1, Date.now(), MAX_TIME]) expect(invalid({ k: { v: 1, t } }), String(t)).toBeNull();
    for (const t of [Infinity, -Infinity, NaN, -1, MAX_TIME + 1, '1', null]) expect(invalid({ k: { v: 1, t } }), String(t)).toMatch(/bad entry/);
  });

  it('refuses values nested past the limit, without overflowing on them', () => {
    const nest = (n: number) => JSON.parse(`${'['.repeat(n)}${']'.repeat(n)}`);
    expect(invalid({ 'list:egg': { v: { for: ['mapo-tofu'], bought: false }, t: 1 } })).toBeNull();
    expect(invalid({ k: { v: nest(LIMITS.depth - 1), t: 1 } })).toBeNull();
    expect(invalid({ k: { v: nest(LIMITS.depth), t: 1 } })).toMatch(/too deep/);
    expect(invalid({ k: { v: nest(20_000), t: 1 } })).toMatch(/too deep/);
    expect(invalid({ k: { v: 1, t: 1, extra: nest(20_000) } })).toMatch(/too deep/);   // beside v, too
    expect(tooDeep(nest(200_000), 16)).toBe(true);
  });

  it('repairs entries stored with a lost time instead of failing the whole doc', () => {
    const stored = { a: { v: 'x', t: null }, b: { v: null, t: null }, c: { v: 1, t: 5 }, d: 'junk' } as unknown;
    const fixed = repair(stored);
    expect(fixed).toEqual({ a: { v: 'x', t: 0 }, b: { v: null, t: 0 }, c: { v: 1, t: 5 } });
    expect(invalid(prune(fixed, 100 * 86_400_000))).toBeNull();
    expect(repair(null)).toEqual({});
  });
});

describe('family codes', () => {
  it('are 20 characters that survive formatting and retyping', () => {
    const code = newFamilyCode();
    expect(code).toHaveLength(20);
    expect(normalizeFamilyCode(formatFamilyCode(code).toUpperCase())).toBe(code);
  });

  it('rejects look-alike letters', () => {
    expect(normalizeFamilyCode('l0o1abcdefghjkmnpqrs')).toBeNull();
  });
});

/** In-memory stand-in for the D1 family store with etags. */
function fakeStore() {
  const blobs = new Map<string, { data: unknown; etag: string }>();
  let n = 0;
  const store: BlobStore & { blobs: typeof blobs } = {
    blobs,
    async getWithMetadata(key) {
      const b = blobs.get(key);
      return b ? { data: structuredClone(b.data), etag: b.etag } : null;
    },
    async setJSON(key, data, options = {}) {
      const b = blobs.get(key);
      if (options.onlyIfNew && b) return { modified: false };
      if (options.onlyIfMatch && b?.etag !== options.onlyIfMatch) return { modified: false };
      blobs.set(key, { data: structuredClone(data), etag: `e${++n}` });
      return { modified: true };
    },
  };
  return store;
}

const post = (body: unknown) => new Request('https://x/api/sync', { method: 'POST', body: JSON.stringify(body) });
const family = 'abcdefghjkmnpqrstuvw';

describe('sync endpoint', () => {
  it('merges what two devices send and returns the whole doc', async () => {
    const store = fakeStore();
    await handleSync(post({ family, entries: { 'fav:a': { v: true, t: 1 } } }), store);
    const res = await handleSync(post({ family, entries: { 'fav:b': { v: true, t: 2 } } }), store);
    expect((await res.json()).entries).toEqual({ 'fav:a': { v: true, t: 1 }, 'fav:b': { v: true, t: 2 } });
  });

  it('keeps families apart and never stores the code itself', async () => {
    const store = fakeStore();
    await handleSync(post({ family, entries: { 'fav:a': { v: true, t: 1 } } }), store);
    const other = await handleSync(post({ family: 'bbbbbbbbbbbbbbbbbbbb', entries: {} }), store);
    expect((await other.json()).entries).toEqual({});
    expect([...store.blobs.keys()].some((k) => k.includes(family))).toBe(false);
  });

  it('retries when another write lands in between', async () => {
    const store = fakeStore();
    await handleSync(post({ family, entries: { a: { v: 1, t: 1 } } }), store);
    const real = store.setJSON.bind(store);
    let raced = false;
    store.setJSON = async (key, data, options) => {
      if (!raced) {
        raced = true;
        await real(key, { a: { v: 1, t: 1 }, b: { v: 2, t: 2 } });
      }
      return real(key, data, options);
    };
    const res = await handleSync(post({ family, entries: { c: { v: 3, t: 3 } } }), store);
    expect(Object.keys((await res.json()).entries).sort()).toEqual(['a', 'b', 'c']);
  });

  it('still merges when the store gives no etag', async () => {
    const store = fakeStore();
    const get = store.getWithMetadata.bind(store);
    store.getWithMetadata = async (key, options) => {
      const b = await get(key, options);
      return b && { data: b.data };
    };
    await handleSync(post({ family, entries: { a: { v: 1, t: 1 } } }), store);
    const res = await handleSync(post({ family, entries: { b: { v: 2, t: 2 } } }), store);
    expect(res.headers.get('x-sync-atomic')).toBe('0');
    expect(Object.keys((await res.json()).entries)).toEqual(['a', 'b']);
  });

  it('rejects bad codes and bad entries', async () => {
    const store = fakeStore();
    expect((await handleSync(post({ family: 'short', entries: {} }), store)).status).toBe(400);
    expect((await handleSync(post({ family, entries: { k: 'x' } }), store)).status).toBe(400);
    expect((await handleSync(new Request('https://x/api/sync'), store)).status).toBe(405);
  });

  it('refuses a time of 1e999 instead of storing it as null', async () => {
    const store = fakeStore();
    const body = `{"family":"${family}","entries":{"k":{"v":1,"t":1e999}}}`;
    expect((await handleSync(new Request('https://x/api/sync', { method: 'POST', body }), store)).status).toBe(400);
    expect(store.blobs.size).toBe(0);
  });

  it('answers 400, not 500, to a value nested twenty thousand deep', async () => {
    const store = fakeStore();
    const body = `{"family":"${family}","entries":{"k":{"t":1,"v":${'['.repeat(20_000)}${']'.repeat(20_000)}}}}`;
    const res = await handleSync(new Request('https://x/api/sync', { method: 'POST', body }), store);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/too deep/);
  });

  it('heals a family whose stored doc has an entry with a lost time', async () => {
    const store = fakeStore();
    await handleSync(post({ family, entries: { a: { v: 'x', t: 1 } } }), store);
    const [key] = store.blobs.keys();
    store.blobs.set(key, { data: { a: { v: 'x', t: null }, gone: { v: null, t: null }, c: { v: 1, t: 2 } }, etag: 'old' });
    const res = await handleSync(post({ family, entries: {} }), store);
    expect(res.status).toBe(200);
    expect((await res.json()).entries).toEqual({ a: { v: 'x', t: 0 }, c: { v: 1, t: 2 } });
    expect(store.blobs.get(key)!.data).toEqual({ a: { v: 'x', t: 0 }, c: { v: 1, t: 2 } });   // written back
    const later = await handleSync(post({ family, entries: { a: { v: 'y', t: 3 } } }), store);
    expect((await later.json()).entries.a).toEqual({ v: 'y', t: 3 });
  });

  it('answers 400, not 500, to a body that is JSON but not an object', async () => {
    const store = fakeStore();
    for (const body of ['null', '5', '"x"', '[]', 'true']) {
      expect((await handleSync(new Request('https://x/api/sync', { method: 'POST', body }), store)).status, body).toBe(400);
    }
  });
});

/** The D1 binding over node:sqlite, running the same SQL the deployed store runs. */
function sqliteD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_families.sql', import.meta.url), 'utf8'));
  const d1: D1 = {
    prepare: (sql) => ({
      bind: (...values) => ({
        first: async <T>() => (db.prepare(sql).get(...(values as string[])) as T | undefined) ?? null,
        run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...(values as string[])).changes) } }),
      }),
    }),
  };
  return { db, d1 };
}

describe('D1 store', () => {
  it('merges, and refuses a write whose etag has gone stale', async () => {
    const { db, d1 } = sqliteD1();
    const store = d1Store(d1);
    await handleSync(post({ family, entries: { a: { v: 1, t: 1 } } }), store);
    const res = await handleSync(post({ family, entries: { b: { v: 2, t: 2 } } }), store);
    expect(res.headers.get('x-sync-atomic')).toBe('1');
    expect(Object.keys((await res.json()).entries)).toEqual(['a', 'b']);

    const { key } = db.prepare('SELECT key FROM families').get() as { key: string };
    const current = await store.getWithMetadata(key, { type: 'json' });
    expect(await store.setJSON(key, {}, { onlyIfNew: true })).toEqual({ modified: false });
    expect(await store.setJSON(key, {}, { onlyIfMatch: current!.etag })).toEqual({ modified: true });
    expect(await store.setJSON(key, {}, { onlyIfMatch: current!.etag })).toEqual({ modified: false });
  });

  it('syncs again after a time of 1e999 was saved as null, as the deployed store did', async () => {
    const { db, d1 } = sqliteD1();
    const store = d1Store(d1);
    await handleSync(post({ family, entries: { a: { v: 1, t: 1 } } }), store);
    db.prepare('UPDATE families SET data = ?').run(JSON.stringify({ a: { v: 1, t: Infinity } }));   // stored as "t":null
    const res = await handleSync(post({ family, entries: { b: { v: 2, t: 2 } } }), store);
    expect(res.status).toBe(200);
    expect((await res.json()).entries).toEqual({ a: { v: 1, t: 0 }, b: { v: 2, t: 2 } });
    const { data } = db.prepare('SELECT data FROM families').get() as { data: string };
    expect(JSON.parse(data).a).toEqual({ v: 1, t: 0 });
  });
});
