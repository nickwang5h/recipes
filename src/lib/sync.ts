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
  /** Containers nested inside one entry. The deepest the site writes is a shopping-list item, `{ v: { for: [...] } }`
   *  (3 with the entry itself); a limit stops a hostile body from overflowing the stack in JSON.stringify. */
  depth: 16,
};

/** The latest time a Date can hold (year 275760). Up to here `t + 1`, which a device writes to win over a clock that
 *  ran ahead, is still exact. */
export const MAX_TIME = 8.64e15;

/** A write time: finite milliseconds since the epoch that a Date can hold. JSON's 1e999 parses as Infinity, which
 *  would be stored as null. */
export function validTime(t: unknown): t is number {
  return typeof t === 'number' && Number.isFinite(t) && t >= 0 && t <= MAX_TIME;
}

/** Whether a parsed JSON value has containers nested more than `limit` deep. Walks without recursion, so it cannot
 *  itself overflow on the value it is guarding against. */
export function tooDeep(value: unknown, limit: number): boolean {
  const stack: [unknown, number][] = [[value, 1]];
  while (stack.length) {
    const [node, depth] = stack.pop()!;
    if (!node || typeof node !== 'object') continue;
    if (depth > limit) return true;
    for (const child of Object.values(node)) stack.push([child, depth + 1]);
  }
  return false;
}

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
    if (!e || typeof e !== 'object' || !validTime((e as Entry).t) || !('v' in e)) return `bad entry ${key}`;
    if (tooDeep(e, LIMITS.depth)) return `too deep ${key}`;
  }
  if (JSON.stringify(doc).length > LIMITS.bytes) return 'too large';
  return null;
}

/**
 * A doc as stored, made valid again. Before times were checked, a write at 1e999 parsed as Infinity and was saved as
 * null, after which every merge failed `invalid` and the family could never sync again. Such an entry keeps its value
 * at time 0, the oldest write there is, so the next real write of that key wins; a tombstone at time 0 is pruned.
 * Anything that is not an entry is dropped.
 */
export function repair(doc: unknown): Doc {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return {};
  const out: Doc = {};
  for (const [key, e] of Object.entries(doc as Record<string, unknown>)) {
    if (!e || typeof e !== 'object' || Array.isArray(e) || !('v' in e)) continue;
    out[key] = validTime((e as Entry).t) ? (e as Entry) : { v: (e as Entry).v, t: 0 };
  }
  return out;
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
