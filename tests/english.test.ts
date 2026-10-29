// English translations must line up with their Chinese source: the same ingredient groups and
// items in the same order, the fixed headings the pages look for, and links kept as written.
// The build checks field types; this catches what a schema can't, file by file.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// Mirrors EN_UNITS in src/content.config.ts, which can't be imported outside Astro.
const EN_UNITS = ['', 'g', 'ml', 'tsp', 'tbsp', 'cup', 'clove', 'slice', 'piece', 'sheet', 'leaf', 'stalk', 'sprig', 'handful', 'knob', 'can'];

const root = new URL('../src/content/', import.meta.url);

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
        expect(en.body).toMatch(/^## Steps$/m);
        expect(en.body).toMatch(/^## Key points$/m);
        const steps = (body: string, heading: RegExp) =>
          (body.split(heading)[1]?.split(/^## /m)[0] ?? '').split('\n').filter((line) => /^\d+\.\s/.test(line)).length;
        expect(steps(en.body, /^## Steps$/m)).toBe(steps(zh.body, /^## 步骤$/m));
      });
    }
  });
}
