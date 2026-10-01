// Shared state for a family: favorites, notes, the week's menu, the fridge and the shopping
// list. Every value lives under its own key with the time it was written, and merging keeps
// the newer write per key, so two phones editing different things never clobber each other.
// Deleting writes `null` (a tombstone) so the deletion itself can win a merge.

export interface Entry {
  v: unknown;
  /** Milliseconds since the epoch, from the device that wrote it. */
  t: number;
}

export type Doc = Record<string, Entry>;

export const LIMITS = {
  keys: 5000,
  keyLength: 120,
  bytes: 256 * 1024,
  /** Tombstones older than this are dropped; every device will have seen them by then. */
  tombstoneDays: 60,
};

/** Newer write wins per key; equal times fall back to comparing values so every device agrees. */
export function merge(a: Doc, b: Doc): Doc {
  const out: Doc = { ...a };
  for (const [key, entry] of Object.entries(b)) {
    const mine = out[key];
    if (!mine || entry.t > mine.t || (entry.t === mine.t && JSON.stringify(entry.v) > JSON.stringify(mine.v))) {
      out[key] = entry;
    }
  }
  return out;
}

export function prune(doc: Doc, now: number): Doc {
  const cutoff = now - LIMITS.tombstoneDays * 86_400_000;
  return Object.fromEntries(Object.entries(doc).filter(([, e]) => e.v !== null || e.t >= cutoff));
}

/** Returns a reason when the doc is malformed or too big, otherwise null. */
export function invalid(doc: unknown): string | null {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return 'not an object';
  const entries = Object.entries(doc as Record<string, unknown>);
  if (entries.length > LIMITS.keys) return 'too many keys';
  for (const [key, e] of entries) {
    if (key.length > LIMITS.keyLength) return 'key too long';
    if (!e || typeof e !== 'object' || typeof (e as Entry).t !== 'number' || !('v' in e)) return `bad entry ${key}`;
  }
  if (JSON.stringify(doc).length > LIMITS.bytes) return 'too large';
  return null;
}

/** A family code: 20 characters from an alphabet without look-alikes (~100 bits). */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const FAMILY_PATTERN = /^[a-hjkmnp-z2-9]{20}$/;

export function newFamilyCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  // 256 is not a multiple of 31; rejecting the top bytes keeps every letter equally likely.
  const out: string[] = [];
  while (out.length < 20) {
    for (const byte of random(32)) {
      if (byte < 248 && out.length < 20) out.push(ALPHABET[byte % 31]);
    }
  }
  return out.join('');
}

/** Codes are typed by hand sometimes; accept spaces, dashes and capitals. */
export function normalizeFamilyCode(input: string): string | null {
  const code = input.toLowerCase().replace(/[\s-]/g, '');
  return FAMILY_PATTERN.test(code) ? code : null;
}

/** For display: groups of four are easier to read aloud. */
export function formatFamilyCode(code: string): string {
  return code.match(/.{1,4}/g)!.join('-');
}
