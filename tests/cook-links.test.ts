// src/data/cook-links.json feeds the phone's cooking mode: the ingredient lines each step uses and
// the step each key point belongs to. It is keyed by position, so an edit that adds a step, a key point
// or an ingredient line must be followed by `node scripts/cook-links.mjs`; this catches the ones that weren't.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipe, stepLinks } from '../scripts/cook-links.mjs';

const root = new URL('../src/content/recipes/', import.meta.url);
const links: Record<string, { steps: string[][]; tips: number[]; checked?: boolean }> = JSON.parse(
  readFileSync(new URL('../src/data/cook-links.json', import.meta.url), 'utf8'),
);
const count = (body: string, heading: string, line: RegExp) =>
  (body.split(/\n## /).find((p) => p.startsWith(heading)) ?? '').split('\n').filter((l) => line.test(l)).length;

describe('cook-links', () => {
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
      // Regenerated entries match what the script makes now.
      if (!entry.checked) expect(entry.steps).toEqual(stepLinks(recipe));
      // The English page has the same number of steps and key points, so the same links fit it.
      let en = '';
      try { en = readFileSync(new URL(`en/${file}`, root), 'utf8'); } catch { return; }
      expect(count(en, 'Steps', /^\d+\.\s/)).toBe(recipe.steps.length);
      expect(count(en, 'Key points', /^-\s/)).toBe(recipe.tips.length);
    });
  }
});
