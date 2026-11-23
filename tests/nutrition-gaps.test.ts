// The nutrition panel across the site: which figures are only lower bounds because ingredients without data make up
// too much of the dish, and which panels are left out. `node scripts/nutrition-gaps.mjs` prints the whole list.
// The recipes below are the cases the 2026-11 review found; when the generator in knowledge-compiler fills their data,
// the expectations here move with it (a floor turning back into an estimate is the point).
import { describe, expect, it } from 'vitest';
import { nutritionGaps } from '../scripts/nutrition-gaps.mjs';

const recipes = nutritionGaps();
const bySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]));

describe('nutrition gaps across the site', () => {
  it('computes every recipe', () => {
    expect(recipes.length).toBeGreaterThan(600);
  });

  it('marks a main ingredient without a figure instead of counting it as zero', () => {
    // ca-ri-ga: 400 ml coconut milk has no sugar or fibre figure.
    const curry = bySlug.get('ca-ri-ga')!;
    expect(curry.shown).toBe(true);
    expect(Object.keys(curry.floors).sort()).toEqual(['fiber', 'sugar']);
    expect(curry.floors.sugar?.refs).toContain('coconut-milk');
  });

  it('does not give an exact sodium figure when a salty pickle has no data', () => {
    // re-gan-mian: 50 g of dried pickled radish is missing from the data altogether.
    const noodles = bySlug.get('re-gan-mian')!;
    expect(noodles.shown).toBe(true);
    expect(noodles.floors.sodium?.refs).toEqual(['dried-pickled-radish']);
    expect(noodles.floors.kcal).toBeDefined();
  });

  it('shows lower bounds instead of hiding the panel when one ingredient has no data', () => {
    for (const slug of ['saucisses-aux-lentilles', 'bing-fen']) {
      const recipe = bySlug.get(slug)!;
      expect(recipe.shown, slug).toBe(true);
      expect(recipe.floors.kcal, slug).toBeDefined();
    }
  });

  it('keeps estimates where only a pinch of spice lacks data', () => {
    const mapo = bySlug.get('mapo-tofu')!;
    expect(mapo.shown).toBe(true);
    expect(mapo.floors).toEqual({});
  });

  it('leaves the panel out today only where a main ingredient cannot be weighed at all (no dish is past SHOW_LIMIT)', () => {
    for (const recipe of recipes.filter((entry) => entry.hasMarks && !entry.shown)) {
      expect(recipe.unknown.length, recipe.slug).toBeGreaterThan(0);
    }
  });
});
