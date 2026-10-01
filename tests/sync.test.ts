import { describe, expect, it } from 'vitest';
import { formatFamilyCode, invalid, merge, newFamilyCode, normalizeFamilyCode, prune, type Doc } from '../src/lib/sync';
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

/** In-memory stand-in for Netlify Blobs with etags. */
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
});
