// The browser side of family sync: one key–value doc in localStorage that every feature reads
// and writes (favorites, notes, menu, fridge, shopping list). Writes are local and instant;
// when the device has joined a family, changed keys are posted to /api/sync in the background
// and the merged doc comes back. Without a family code nothing leaves the device.
import { merge, newFamilyCode, prune, type Doc } from '../lib/sync';

const DOC = 'recipes:v2:doc';
const PENDING = 'recipes:v2:pending';
const FAMILY = 'recipes:family';
const LEGACY_FRIDGE = 'recipes:v1:fridge';

export type SyncState = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

let doc: Doc = read<Doc>(DOC, {});
let pending = new Set<string>(read<string[]>(PENDING, []));
let family: string | null = read<string | null>(FAMILY, null);
let state: SyncState = family ? 'synced' : 'local';
let lastSynced = 0;
const listeners = new Set<() => void>();

const persist = () => {
  write(DOC, doc);
  write(PENDING, [...pending]);
};
const notify = () => listeners.forEach((fn) => fn());
const setState = (next: SyncState) => {
  state = next;
  notify();
};

// The fridge page used to keep its own blob; fold it into the shared doc once.
(() => {
  const legacy = read<{ chosen?: string[]; staplesOff?: string[]; list?: { id: string; for: string[]; bought: boolean }[]; parts?: boolean } | null>(LEGACY_FRIDGE, null);
  if (!legacy) return;
  const t = Date.now();
  for (const id of legacy.chosen ?? []) doc[`have:${id}`] ??= { v: true, t };
  for (const id of legacy.staplesOff ?? []) doc[`staple-off:${id}`] ??= { v: true, t };
  for (const item of legacy.list ?? []) doc[`list:${item.id}`] ??= { v: { for: item.for, bought: item.bought }, t };
  if (legacy.parts) doc['pref:parts'] ??= { v: true, t };
  Object.keys(doc).forEach((k) => pending.add(k));
  persist();
  try {
    localStorage.removeItem(LEGACY_FRIDGE);
  } catch {}
})();

export function get<T>(key: string): T | undefined {
  const v = doc[key]?.v;
  return v === null || v === undefined ? undefined : (v as T);
}

/** Every live key under a prefix, with the prefix removed. */
export function keys(prefix: string): string[] {
  return Object.keys(doc)
    .filter((k) => k.startsWith(prefix) && doc[k].v !== null)
    .map((k) => k.slice(prefix.length));
}

/** `undefined` or `null` deletes. Several writes in one go share a timestamp and one sync. */
export function set(key: string, value: unknown) {
  setMany({ [key]: value });
}

export function setMany(values: Record<string, unknown>) {
  const t = Date.now();
  for (const [key, value] of Object.entries(values)) {
    const v = value === undefined ? null : value;
    // Deleting something that was never there needs no tombstone.
    if (v === null && !doc[key]) continue;
    doc[key] = { v, t: Math.max(t, (doc[key]?.t ?? 0) + 1) };
    pending.add(key);
  }
  persist();
  notify();
  scheduleSync();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const syncStatus = () => ({ state, family, lastSynced, pending: pending.size });

// ---------- Sync ----------

let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<void> | null = null;
let again = false;

function scheduleSync(delay = 1500) {
  if (!family) return;
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

export async function syncNow(): Promise<void> {
  if (!family) return;
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = (async () => {
    const sent = Object.fromEntries([...pending].filter((k) => doc[k]).map((k) => [k, doc[k]]));
    setState('syncing');
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ family, entries: sent }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { entries: Doc };
      doc = prune(merge(doc, body.entries), Date.now());
      // Keys edited again while the request was out stay pending.
      for (const [k, e] of Object.entries(sent)) if (doc[k]?.t === e.t) pending.delete(k);
      // Anything the server lacks or has an older copy of goes out next time, so a write lost
      // on the server (or a family joined on another device) heals itself.
      for (const [k, e] of Object.entries(doc)) {
        const theirs = body.entries[k];
        if (!theirs || theirs.t < e.t) pending.add(k);
      }
      persist();
      lastSynced = Date.now();
      setState('synced');
    } catch {
      setState(navigator.onLine ? 'error' : 'offline');
    } finally {
      inFlight = null;
      if (again) {
        again = false;
        scheduleSync(300);
      }
    }
  })();
  return inFlight;
}

export function joinFamily(code: string) {
  family = code;
  write(FAMILY, code);
  // Bring everything this device already has into the family.
  Object.keys(doc).forEach((k) => pending.add(k));
  persist();
  return syncNow();
}

export function createFamily() {
  return joinFamily(newFamilyCode());
}

/** Stops syncing; what is already on this device stays. */
export function leaveFamily() {
  family = null;
  try {
    localStorage.removeItem(FAMILY);
  } catch {}
  setState('local');
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === DOC) {
      doc = read<Doc>(DOC, {});
      notify();
    } else if (event.key === FAMILY) {
      family = read<string | null>(FAMILY, null);
      notify();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(0);
  });
  window.addEventListener('online', () => scheduleSync(0));
  setInterval(() => {
    if (document.visibilityState === 'visible') scheduleSync(0);
  }, 60_000);
  scheduleSync(0);
}
