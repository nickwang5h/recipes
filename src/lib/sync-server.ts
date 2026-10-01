// The /api/sync endpoint, kept free of Netlify imports so it can be tested with a fake store.
// A client posts the entries it changed; the server merges them into the family's doc and
// returns the whole merged doc. Concurrent posts are serialized with an etag check and retry.
import { FAMILY_PATTERN, invalid, merge, prune, type Doc } from './sync';

export interface BlobStore {
  getWithMetadata(key: string, options: { type: 'json' }): Promise<{ data: unknown; etag?: string } | null>;
  setJSON(key: string, data: unknown, options?: { onlyIfMatch?: string; onlyIfNew?: boolean }): Promise<{ modified: boolean }>;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });

/** The blob is keyed by a hash so the store listing never shows a usable family code. */
async function blobKey(family: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`recipes-family:${family}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handleSync(request: Request, store: BlobStore, now = Date.now()): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405);
  const text = await request.text();
  if (text.length > 300 * 1024) return json({ error: 'too large' }, 413);
  let body: { family?: unknown; entries?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  if (typeof body.family !== 'string' || !FAMILY_PATTERN.test(body.family)) return json({ error: 'bad family code' }, 400);
  const incoming = body.entries ?? {};
  const reason = invalid(incoming);
  if (reason) return json({ error: reason }, 400);

  const key = await blobKey(body.family);
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(key, { type: 'json' });
    const base = (current?.data as Doc | undefined) ?? {};
    const merged = prune(merge(base, incoming as Doc), now);
    if (invalid(merged)) return json({ error: 'family data is full' }, 413);
    // Nothing new: answer without a write.
    if (current && JSON.stringify(merged) === JSON.stringify(base)) return json({ entries: merged });
    // Some stores (the local dev sandbox) return no etag on read. The write is then unconditional;
    // a lost update is repaired by clients, which resend any entry the server turns out to lack.
    const condition = !current ? { onlyIfNew: true } : current.etag ? { onlyIfMatch: current.etag } : {};
    const result = await store.setJSON(key, merged, condition);
    if (result.modified) return json({ entries: merged }, 200, { 'x-sync-atomic': !current || current.etag ? '1' : '0' });
  }
  return json({ error: 'busy, try again' }, 409);
}
