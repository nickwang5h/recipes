import { describe, expect, it } from 'vitest';
import { suggestDish, suggestTable, weekNeeds, type MenuRecipe } from '../src/lib/menu';

const r = (id: string, course: string, cuisine = 'chinese', minutes = 20, req: string[] = [], component = false): MenuRecipe => ({
  id, title: id, course, cuisine, minutes, req, component,
});

const recipes = [
  r('hong-shao-rou', 'meat', 'chinese', 120),
  r('steamed-fish', 'seafood', 'chinese', 30),
  r('tomato-egg', 'veg'),
  r('ratatouille', 'veg', 'french', 60),
  r('zi-cai-tang', 'soup'),
  r('tang-cu-zhi', 'sauce', 'chinese', 10, [], true),
];
const none = { favorites: new Set<string>(), planned: new Set<string>() };

describe('suggesting a table', () => {
  it('fills a meat, a vegetable and a soup slot', () => {
    const table = suggestTable(recipes, { ...none, random: () => 0 });
    expect(table.main?.course).toMatch(/meat|seafood/);
    expect(table.veg?.course).toBe('veg');
    expect(table.soup?.id).toBe('zi-cai-tang');
  });

  it('respects the time limit and skips what is already planned', () => {
    const main = suggestDish(recipes, 'main', { ...none, planned: new Set(['steamed-fish']), maxMinutes: 60 });
    expect(main).toBeUndefined();
  });

  it('never suggests components', () => {
    for (let i = 0; i < 20; i++) expect(suggestDish(recipes, 'veg', { ...none, random: () => i / 20 })?.component).toBe(false);
  });

  it('prefers the main dish cuisine for the other slots', () => {
    // With random just below 1, an unweighted pick would land on the last veg (french).
    const veg = suggestDish(recipes, 'veg', { ...none, cuisine: 'chinese', random: () => 0.6 });
    expect(veg?.id).toBe('tomato-egg');
  });
});

describe('what the week needs', () => {
  it('lists missing ingredients with the dishes that need them', () => {
    const dishes = [r('a', 'veg', 'chinese', 10, ['egg', 'tomato', 'salt', 'water']), r('b', 'veg', 'chinese', 10, ['tomato', 'scallion'])];
    const needs = weekNeeds(dishes, new Set(['egg']), new Set(['salt']));
    expect([...needs]).toEqual([['tomato', ['a', 'b']], ['scallion', ['b']]]);
  });
});

describe('season', () => {
  it('makes an in-season dish more likely', () => {
    const veg = [r('a', 'veg'), { ...r('b', 'veg'), season: [10] }];
    // Unweighted, 0.45 lands on a; with b weighted 1.5 the split point moves to 0.4.
    expect(suggestDish(veg, 'veg', { ...none, random: () => 0.45 })?.id).toBe('a');
    expect(suggestDish(veg, 'veg', { ...none, month: 10, random: () => 0.45 })?.id).toBe('b');
  });
});
