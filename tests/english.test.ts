// English translations must line up with their Chinese source: the same ingredient groups and
// items in the same order, the fixed headings the pages look for, and links kept as written.
// The build checks field types; this catches what a schema can't, file by file.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { unitLabel } from '../src/lib/scale';

// Mirrors EN_UNITS in src/content.config.ts, which can't be imported outside Astro.
const EN_UNITS = ['', 'g', 'ml', 'tsp', 'tbsp', 'cup', 'clove', 'slice', 'piece', 'sheet', 'leaf', 'stalk', 'sprig', 'handful', 'knob', 'can'];

const root = new URL('../src/content/', import.meta.url);

// The page prints `quantity unit name`. Words that count things: when the page already prints a unit
// word, a name starting or ending with one of these reads "2 cloves garlic cloves" or "2 slices bay leaves".
const COUNTING = new Set(['clove', 'cloves', 'slice', 'slices', 'piece', 'pieces', 'sheet', 'sheets', 'leaf', 'leaves', 'stalk', 'stalks',
  'sprig', 'sprigs', 'handful', 'handfuls', 'knob', 'knobs', 'can', 'cans', 'fillet', 'fillets', 'wrapper', 'wrappers']);
// Bare counts need [singular, plural]; these names are the same in both.
const SAME_PLURAL = new Set(['star anise', 'tsaoko']);
// An English line must name its ingredient: some word of the name appears in the catalog's English
// name or id, so two lines swapped in the English file (100 ml of "coarse salt") fail. Specific names
// the catalog word doesn't cover are listed per ingredient.
const catalog = new Map<string, string>(
  (parse(readFileSync(new URL('../src/data/ingredients.yaml', import.meta.url), 'utf8')) as { id: string; en: string }[]).map((e) => [e.id, e.en]),
);
const ALSO: Record<string, string[]> = {
  water: ['ice', 'cube'],
  beef: ['steak'],
  'bread-crumbs': ['breadcrumb', 'panko'],
  'chicken-stock': ['broth'],
  leek: ['onion', 'negi'],
  'white-pepper': ['peppercorn'],
};
const STOP = new Set(['and', 'the', 'for', 'with', 'fresh', 'dried', 'raw', 'whole', 'small', 'large', 'part', 'white', 'green']);
const stem = (w: string) => w.replace(/ies$/, 'y').replace(/(oes|ches|shes|ses)$/, (m) => m.slice(0, -2)).replace(/s$/, '');
const words = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem);

function read(collection: string, lang: string, slug: string) {
  const text = readFileSync(new URL(`${collection}/${lang}/${slug}.md`, root), 'utf8');
  const [, front, body] = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)!;
  return { data: parse(front), body };
}

const slugs = (collection: string) =>
  readdirSync(new URL(`${collection}/en/`, root)).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));

const links = (body: string) => [...body.matchAll(/\]\((\/[^)]*)\)/g)].map((m) => m[1]).sort();

for (const collection of ['recipes', 'principles', 'cuisines', 'regions']) {
  describe(`${collection}/en`, () => {
    for (const slug of slugs(collection)) {
      it(slug, () => {
        expect(existsSync(new URL(`${collection}/zh/${slug}.md`, root)), 'no Chinese source with this slug').toBe(true);
        const zh = read(collection, 'zh', slug);
        const en = read(collection, 'en', slug);
        expect(en.body, 'Chinese characters left in the body').not.toMatch(/[一-鿿]/u);
        // A later edit to the Chinese page needs carrying over; then copy its new `updated` date.
        if (zh.data.updated) expect(String(en.data.translated), 'Chinese page changed since this translation').toBe(String(zh.data.updated));
        expect(links(en.body)).toEqual(links(zh.body));
        if (collection !== 'recipes') return;
        // Other cuisines show their own name under the English title, copied from the Chinese file.
        if (zh.data.cuisine !== 'chinese') expect(en.data.original, 'original: copy the Chinese file\'s original').toBe(zh.data.original);

        expect(en.data.ingredients.map((g: { items: unknown[] }) => g.items.length)).toEqual(
          zh.data.ingredients.map((g: { items: unknown[] }) => g.items.length),
        );
        for (const item of en.data.ingredients.flatMap((g: { items: { name: unknown }[] }) => g.items)) {
          // An unquoted comma inside `{ ... }` starts a new key and cuts the note short.
          const extra = Object.keys(item).filter((k) => !['name', 'unit', 'note'].includes(k));
          expect(extra, `stray keys ${JSON.stringify(extra)}: quote values that contain commas`).toEqual([]);
          if ('unit' in item) expect(EN_UNITS as readonly unknown[], `unit ${JSON.stringify(item.unit)}`).toContain(item.unit);
          const ok = typeof item.name === 'string' || (Array.isArray(item.name) && item.name.length === 2 && item.name.every((n: unknown) => typeof n === 'string'));
          expect(ok, `name ${JSON.stringify(item.name)}: a string or [singular, plural]; quote names with commas`).toBe(true);
        }
        zh.data.ingredients.forEach((group: { group?: string; items: { note?: string }[] }, g: number) => {
          const twin = en.data.ingredients[g];
          expect(Boolean(twin.group), `group ${g} name`).toBe(Boolean(group.group));
          group.items.forEach((item, i) => expect(Boolean(twin.items[i].note), `note on ${g}-${i}`).toBe(Boolean(item.note)));
        });
        zh.data.ingredients.forEach((group: { items: { ref: string; qty?: number; unit?: string }[] }, g: number) => {
          group.items.forEach((item, i) => {
            const line = en.data.ingredients[g].items[i] as { name: string | string[]; unit?: string };
            const where = `${g + 1}.${i + 1} ${JSON.stringify(line.name)}`;
            const names = Array.isArray(line.name) ? line.name : [line.name];
            const own = new Set([...words(item.ref.replace(/-/g, ' ')), ...words(catalog.get(item.ref) ?? ''), ...(ALSO[item.ref] ?? [])]);
            expect(names.some((n) => words(n).some((w) => own.has(w))), `${where} shares no word with its ingredient ${item.ref} (${catalog.get(item.ref)}): lines swapped?`).toBe(true);
            if (item.qty == null) return;
            // Both the listed amount and a scaled-up one, since the unit word turns plural.
            for (const qty of [item.qty, item.qty * 4]) {
              const word = unitLabel(item.unit, qty, 'en', line.unit);
              if (!COUNTING.has(word)) continue;
              for (const n of names) {
                const ends = n.toLowerCase().split(/\s+/);
                expect(COUNTING.has(ends[0]) || COUNTING.has(ends.at(-1)!), `${where} prints as "${word} ${n}": drop the counting word or set unit: ''`).toBe(false);
              }
            }
            if (unitLabel(item.unit, item.qty, 'en', line.unit) === '' && typeof line.name === 'string')
              expect(SAME_PLURAL.has(line.name), `${where} is a bare count: write [singular, plural]`).toBe(true);
          });
        });
        expect(en.body).toMatch(/^## Steps$/m);
        expect(en.body).toMatch(/^## Key points$/m);
        const steps = (body: string, heading: RegExp) =>
          (body.split(heading)[1]?.split(/^## /m)[0] ?? '').split('\n').filter((line) => /^\d+\.\s/.test(line)).length;
        expect(steps(en.body, /^## Steps$/m)).toBe(steps(zh.body, /^## 步骤$/m));
      });
    }
  });
}
