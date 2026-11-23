// src/data/cook-links.json feeds the phone's cooking mode: the ingredient lines each step uses and
// the step each key point belongs to. It is keyed by position, so an edit that adds a step, a key point
// or an ingredient line must be followed by `node scripts/cook-links.mjs`; this catches the ones that weren't.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipe, stepLinks } from '../scripts/cook-links.mjs';

const root = new URL('../src/content/recipes/', import.meta.url);
const links: Record<string, { steps: string[][]; tips: number[]; checked?: boolean }> = JSON.parse(
  readFileSync(new URL('../src/data/cook-links.json', import.meta.url), 'utf8'),
);
// Entries marked `checked` are kept by the script, so nothing regenerates them when the lines they point
// at move. Each is pinned to the ingredient lines it was read against (position, ref and name); when a
// recipe's lines change, read its links again in cook-links.json and put the new fingerprint here.
const CHECKED_AGAINST: Record<string, string> = {
  'bo-kho': '67f408b3',
  'bo-luc-lac': 'ec0dd1a0',
  'bun-thit-nuong': '4ca7ec17',
  'ca-kho-to': 'e2e99521',
  'caponata': '62b47261',
  'chao-hua-dan': '2ac99ae2',
  'chikuzenni': '563e3fd8',
  'cotes-de-porc-charcutieres': '69842e59',
  'dashi': '63d2e325',
  'hobak-jeon': 'faecec17',
  'hong-shao-rou': 'a8351519',
  'horenso-no-gomaae': 'fa7248d7',
  'hotteok': 'd17a9d54',
  'kalguksu': '7b54e8bb',
  'karaage': '7c4cb467',
  'la-wei-bao-zai-fan': 'ce094d71',
  'luo-song-tang': '96a75291',
  'ma-la-gao': '6b1ee310',
  'mayonnaise': '72632aed',
  'moo-ping': 'ce7a9158',
  'mousse-au-chocolat': 'e7824844',
  'nam-jim-jaew': 'd68f2e15',
  'oi-muchim': '1468b1dd',
  'pad-pak-boong': '5ba0e843',
  'panzanella': 'db7d499c',
  'petits-pois-a-la-francaise': '76526a9b',
  'ragu-napoletano': '7b5e3833',
  'tian-provencal': '4fb51e26',
  'tub-tim-krob': '811727e5',
  'vitello-tonnato': '2aebeccb',
  'xing-zhou-chao-mi': 'a4d3145c',
};
const fingerprint = (data: { ingredients: { items: { ref: string; name?: string }[] }[] }) =>
  createHash('sha1')
    .update(data.ingredients.flatMap((g, gi) => g.items.map((it, ii) => `${gi}-${ii} ${it.ref} ${it.name ?? ''}`)).join('\n'))
    .digest('hex')
    .slice(0, 8);

const count = (body: string, heading: string, line: RegExp) =>
  (body.split(/\n## /).find((p) => p.startsWith(heading)) ?? '').split('\n').filter((l) => line.test(l)).length;

describe('cook-links', () => {
  it('pins exactly the checked entries', () => {
    expect(Object.keys(CHECKED_AGAINST).sort()).toEqual(Object.keys(links).filter((id) => links[id].checked).sort());
  });

  for (const file of readdirSync(new URL('zh/', root)).filter((f) => f.endsWith('.md'))) {
    const id = file.slice(0, -3);
    it(id, () => {
      const recipe = parseRecipe(readFileSync(new URL(`zh/${file}`, root), 'utf8'));
      const entry = links[id];
      expect(entry, 'no entry; run node scripts/cook-links.mjs').toBeDefined();
      expect(entry.steps.length).toBe(recipe.steps.length);
      expect(entry.tips.length).toBe(recipe.tips.length);
      const lines = new Set(recipe.data.ingredients.flatMap((g: { items: unknown[] }, gi: number) => g.items.map((_, ii) => `${gi}-${ii}`)));
      for (const key of entry.steps.flat()) expect(lines.has(key), `no ingredient line ${key}`).toBe(true);
      for (const tip of entry.tips) expect(tip >= -1 && tip < recipe.steps.length).toBe(true);
      // Regenerated entries match what the script makes now; checked ones, the lines they were read against.
      if (!entry.checked) expect(entry.steps).toEqual(stepLinks(recipe));
      else expect(fingerprint(recipe.data), 'ingredient lines changed since the links were checked by hand: check them again, then update CHECKED_AGAINST').toBe(CHECKED_AGAINST[id]);
      // The English page has the same number of steps and key points, so the same links fit it.
      let en = '';
      try { en = readFileSync(new URL(`en/${file}`, root), 'utf8'); } catch { return; }
      expect(count(en, 'Steps', /^\d+\.\s/)).toBe(recipe.steps.length);
      expect(count(en, 'Key points', /^-\s/)).toBe(recipe.tips.length);
    });
  }
});
