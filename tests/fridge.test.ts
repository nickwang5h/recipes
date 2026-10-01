import { describe, expect, it } from 'vitest';
import { matchRecipes, searchIngredients } from '../src/lib/fridge';

const recipes = [
  { id: 'tomato-egg', req: ['tomato', 'egg', 'salt', 'water'] },
  { id: 'steamed-fish', req: ['sea-bass', 'ginger', 'scallion', 'light-soy-sauce'] },
  { id: 'braised-carp', req: ['grass-carp', 'ginger'] },
  { id: 'plain-rice', req: ['jasmine-rice', 'water'] },
  { id: 'salt-water', req: ['salt', 'water'] },
];

const base = { staples: new Set(['salt', 'light-soy-sauce']), substitutes: { 'grass-carp': ['carp'] }, maxMissing: 2 };

describe('matchRecipes', () => {
  it('counts staples and water as available', () => {
    const out = matchRecipes(recipes, { ...base, chosen: new Set(['tomato', 'egg']) });
    expect(out.map((m) => [m.recipe.id, m.missing])).toEqual([['tomato-egg', []]]);
  });

  it('lists missing ingredients and drops recipes over the limit', () => {
    const out = matchRecipes(recipes, { ...base, chosen: new Set(['ginger']) });
    expect(out.map((m) => [m.recipe.id, m.missing])).toEqual([
      ['braised-carp', ['grass-carp']],
      ['steamed-fish', ['sea-bass', 'scallion']],
    ]);
    expect(matchRecipes(recipes, { ...base, chosen: new Set(['ginger']), maxMissing: 1 })).toHaveLength(1);
  });

  it('covers a gap with a catalog substitute', () => {
    const [m] = matchRecipes(recipes, { ...base, chosen: new Set(['carp', 'ginger']) });
    expect(m.recipe.id).toBe('braised-carp');
    expect(m.missing).toEqual([]);
    expect(m.swaps).toEqual([['grass-carp', 'carp']]);
    expect(m.used).toBe(2);
  });

  it('ignores recipes that use none of the chosen ingredients', () => {
    expect(matchRecipes(recipes, { ...base, chosen: new Set() })).toEqual([]);
    const ids = matchRecipes(recipes, { ...base, chosen: new Set(['egg']) }).map((m) => m.recipe.id);
    expect(ids).not.toContain('salt-water');
  });

  it('ranks fewer missing first, then more chosen used, then input order', () => {
    const out = matchRecipes(recipes, { ...base, chosen: new Set(['ginger', 'scallion', 'tomato']) });
    expect(out.map((m) => m.recipe.id)).toEqual(['steamed-fish', 'tomato-egg', 'braised-carp']);
  });
});

describe('searchIngredients', () => {
  const items = [
    { id: 'scallion', names: ['小葱', '葱', '葱花', 'Scallions'] },
    { id: 'onion', names: ['洋葱', 'Yellow onion'] },
    { id: 'leek', names: ['大葱', 'Leek'] },
  ];

  it('ranks exact, then prefix, then substring hits', () => {
    expect(searchIngredients(items, '葱').map((i) => i.id)).toEqual(['scallion', 'onion', 'leek']);
    expect(searchIngredients(items, 'yel').map((i) => i.id)).toEqual(['onion']);
    expect(searchIngredients(items, 'LEEK').map((i) => i.id)).toEqual(['leek']);
  });

  it('returns nothing for a blank query', () => {
    expect(searchIngredients(items, '  ')).toEqual([]);
  });
});
