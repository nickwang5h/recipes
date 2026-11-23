import { describe, expect, it } from 'vitest';
import { GAP_LIMIT, SHOW_LIMIT, complete, dailyValue, gapShare, lighterItems, perServing, safetyNotes, worthShowing, type Foods } from '../src/lib/nutrition';

const foods: Foods = {
  'chicken-thigh': { per100g: { kcal: 121, protein: 19.7, fat: 4.1, satfat: 1, carb: 0, sugar: 0, fiber: 0, sodium: 95 }, grams: {}, density: null, safety: 'poultry' },
  'light-soy-sauce': { per100g: { kcal: 53, protein: 8, fat: 0.6, satfat: 0.1, carb: 4.9, sugar: 0.4, fiber: 0.6, sodium: 5493 }, grams: {}, density: 1.07, safety: 'none' },
  garlic: { per100g: { kcal: 149, protein: 6.4, fat: 0.5, satfat: 0.1, carb: 33, sugar: 1, fiber: 2.1, sodium: 17 }, grams: { 瓣: 3 }, density: null, safety: 'none' },
  'vegetable-oil': { per100g: { kcal: 884, protein: 0, fat: 100, satfat: 7, carb: 0, sugar: 0, fiber: 0, sodium: 0 }, grams: {}, density: 0.92, safety: 'none' },
  egg: { per100g: { kcal: 143, protein: 12.6, fat: 9.5, satfat: 3.1, carb: 0.7, sugar: 0.4, fiber: 0, sodium: 142 }, grams: { 个: 50 }, density: null, safety: 'egg' },
};

const items = [
  { key: '0-0', ref: 'chicken-thigh', qty: 400, unit: 'g' },
  { key: '0-1', ref: 'light-soy-sauce', qty: 2, unit: '汤匙' },
  { key: '0-2', ref: 'garlic', qty: 2, unit: '瓣' },
  { key: '1-0', ref: 'vegetable-oil', qty: 500, unit: 'ml' },
  { key: '1-1', ref: 'salt' },
  { key: '1-2', ref: 'sansho', qty: 1, unit: '茶匙', optional: true },
];

describe('nutrition per serving', () => {
  it('sums what is eaten, split by servings', () => {
    const made = perServing(items, 2, foods, { eaten: { '1-0': 0.1 }, raw: [] });
    const oil = 500 * 0.92 * 0.1;
    expect(made!.per.fat).toBeCloseTo((400 * 0.041 + 30 * 1.07 * 0.006 + 6 * 0.005 + oil) / 2, 6);
    expect(made!.per.sodium).toBeCloseTo((400 * 0.95 + 30 * 1.07 * 54.93 + 6 * 0.17) / 2, 6);
  });

  it('names required items it cannot weigh and skips optional ones', () => {
    expect(perServing(items, 2, foods, undefined)!.leftOut).toEqual(['1-1']);
    const { garlic: _, ...noGarlic } = foods;
    const made = perServing(items, 2, noGarlic, undefined)!;
    expect(made.leftOut).toEqual(['0-2', '1-1']);
    expect(made.unknown).toEqual(['0-2']);   // measured, but no data: the one that matters
  });

  it('counts water as nothing whatever its unit', () => {
    const water = { per100g: { kcal: 0, protein: 0, fat: 0, satfat: 0, carb: 0, sugar: 0, fiber: 0, sodium: 0 }, grams: {}, density: 1, safety: 'none' };
    expect(perServing([{ key: '0-0', ref: 'water', qty: 2, unit: '个' }, items[0]], 2, { ...foods, water }, undefined)!.leftOut).toEqual([]);
  });

  it('shows numbers only when every measured ingredient missing data is a seasoning', () => {
    const { garlic: _, ...noGarlic } = foods;
    const made = perServing(items, 2, noGarlic, undefined)!;
    expect(worthShowing(made, items, (ref) => (ref === 'garlic' ? 'aromatic' : 'meat'))).toBe(false);
    expect(worthShowing(made, items, () => 'seasoning')).toBe(true);
  });

  it('gives no numbers when nothing can be weighed', () => {
    expect(perServing([{ key: '0-0', ref: 'salt' }], 2, foods, undefined)).toBeNull();
  });

  it('reads percent daily value against the Canadian label values', () => {
    expect(dailyValue('sodium', 1150)).toBe(50);
    expect(dailyValue('fiber', 7)).toBe(25);
    expect(dailyValue('kcal', 500)).toBeNull();
  });
});

describe('figures with ingredients missing data', () => {
  const coconut = { per100g: { kcal: 230, protein: 2.3, fat: 24, satfat: 21, carb: 5.5, sugar: null, fiber: null, sodium: 15 }, grams: {}, density: 1, safety: 'none' };
  const dish = (extra: { key: string; ref: string; qty?: number; unit?: string }[]) => [{ key: '0-0', ref: 'chicken-thigh', qty: 900, unit: 'g' }, ...extra];

  it('weighs, per nutrient, what has a figure and what has none', () => {
    const made = perServing(dish([{ key: '0-1', ref: 'coconut-milk', qty: 100, unit: 'ml' }]), 4, { ...foods, 'coconut-milk': coconut }, undefined)!;
    expect(made.weighed.sugar).toEqual({ known: 900, missing: 100 });
    expect(made.weighed.fat).toEqual({ known: 1000, missing: 0 });
    expect(made.gaps.sugar).toEqual(['0-1']);
    expect(made.gaps.fat).toEqual([]);
    expect(gapShare(made, 'sugar')).toBeCloseTo(0.1, 6);
    expect(made.leftOut).toEqual([]);   // counted for everything it has
  });

  it('keeps a figure as an estimate under the limit and makes it a lower bound over it', () => {
    const small = perServing(dish([{ key: '0-1', ref: 'coconut-milk', qty: 30, unit: 'g' }]), 4, { ...foods, 'coconut-milk': coconut }, undefined)!;
    expect(gapShare(small, 'sugar')).toBeLessThan(GAP_LIMIT.sugar);
    expect(complete(small, 'sugar')).toBe(true);
    const large = perServing(dish([{ key: '0-1', ref: 'coconut-milk', qty: 400, unit: 'ml' }]), 4, { ...foods, 'coconut-milk': coconut }, undefined)!;
    expect(complete(large, 'sugar')).toBe(false);
    expect(complete(large, 'fiber')).toBe(false);
    expect(complete(large, 'satfat')).toBe(true);
    expect(large.per.sugar).toBe(0);   // the chicken's sugar: a floor, not the dish's sugar
  });

  it('counts an ingredient missing from the data as missing every figure, by its written weight', () => {
    const made = perServing(dish([{ key: '0-1', ref: 'dried-pickled-radish', qty: 100, unit: 'g' }]), 4, foods, undefined)!;
    expect(made.leftOut).toEqual(['0-1']);
    expect(made.unknown).toEqual([]);   // its weight is known, so how much is missing is known too
    for (const key of ['kcal', 'sodium', 'protein'] as const) {
      expect(made.weighed[key]).toEqual({ known: 900, missing: 100 });
      expect(complete(made, key)).toBe(false);
    }
  });

  it('guesses spoons of an ingredient without data at 1 g/ml, and leaves counts it cannot weigh as unknown', () => {
    const made = perServing(dish([{ key: '0-1', ref: 'sichuan-pepper', qty: 1, unit: '茶匙' }, { key: '0-2', ref: 'clove', qty: 2, unit: '个' }]), 4, foods, undefined)!;
    expect(made.weighed.kcal.missing).toBe(5);
    expect(made.unknown).toEqual(['0-2']);
    expect(complete(made, 'kcal')).toBe(true);   // a pinch of spice in 900 g of chicken
  });

  it('holds sodium to a tighter limit: a spoon of an unmeasured sauce can carry much of the salt', () => {
    const made = perServing(dish([{ key: '0-1', ref: 'chili-garlic-sauce', qty: 20, unit: 'g' }]), 4, foods, undefined)!;
    expect(gapShare(made, 'sodium')).toBeGreaterThan(GAP_LIMIT.sodium);
    expect(complete(made, 'sodium')).toBe(false);
    expect(complete(made, 'kcal')).toBe(true);
  });

  it('weighs only what is eaten, and not water', () => {
    const water = { per100g: { kcal: 0, protein: 0, fat: 0, satfat: 0, carb: 0, sugar: 0, fiber: 0, sodium: 0 }, grams: {}, density: 1, safety: 'none' };
    const made = perServing(dish([{ key: '0-1', ref: 'ice-jelly-seed', qty: 50, unit: 'g' }, { key: '0-2', ref: 'water', qty: 1000, unit: 'ml' }]), 4, { ...foods, water }, { eaten: { '0-1': 0.1 }, raw: [] })!;
    expect(made.weighed.kcal).toEqual({ known: 900, missing: 5 });
  });

  it('shows the panel with lower bounds when a main ingredient lacks data, and leaves it out only past the show limit', () => {
    const kind = (ref: string) => (ref === 'clove' ? 'seasoning' : 'meat');
    const sausage = dish([{ key: '0-1', ref: 'morteau-sausage', qty: 300, unit: 'g' }]);
    const some = perServing(sausage, 4, foods, undefined)!;
    expect(complete(some, 'kcal')).toBe(false);
    expect(worthShowing(some, sausage, kind)).toBe(true);
    const mostly = dish([{ key: '0-1', ref: 'morteau-sausage', qty: 1000, unit: 'g' }]);
    const most = perServing(mostly, 4, foods, undefined)!;
    expect(gapShare(most, 'kcal')).toBeGreaterThan(SHOW_LIMIT);
    expect(worthShowing(most, mostly, kind)).toBe(false);
  });

  it('leaves the panel out when a main ingredient cannot even be weighed, but not for a few cloves', () => {
    const kind = (ref: string) => (ref === 'clove' ? 'seasoning' : 'meat');
    const cloves = dish([{ key: '0-1', ref: 'clove', qty: 2, unit: '个' }]);
    expect(worthShowing(perServing(cloves, 4, foods, undefined)!, cloves, kind)).toBe(true);
    const sausages = dish([{ key: '0-1', ref: 'fresh-pork-sausage', qty: 4, unit: '个' }]);
    expect(worthShowing(perServing(sausages, 4, foods, undefined)!, sausages, kind)).toBe(false);
  });
});

describe('food safety notes', () => {
  it('gives the internal temperature for each kind of raw food once', () => {
    const notes = safetyNotes([...items, { key: '2-0', ref: 'chicken-thigh', qty: 100, unit: 'g' }], foods, { eaten: {}, raw: [] });
    expect(notes.temperatures).toHaveLength(1);
    expect(notes.temperatures[0]).toContain('74℃');
    expect(notes.raw).toEqual([]);
  });

  it('warns about food served raw instead of giving its temperature', () => {
    const notes = safetyNotes([{ key: '0-0', ref: 'egg', qty: 2, unit: '个' }], foods, { eaten: {}, raw: ['0-0'] });
    expect(notes.temperatures).toEqual([]);
    expect(notes.raw[0]).toContain('巴氏');
  });
});

describe('lighter versions', () => {
  it('applies cuts, removals and additions, and the numbers follow', () => {
    const lighter = { target: 'sodium' as const, changes: [{ key: '0-1', qty: 1 }, { key: '0-2', remove: true as const }], add: [{ ref: 'egg', qty: 1, unit: '个', note: '' }], how: '出锅前尝味。' };
    const changed = lighterItems(items, lighter);
    expect(changed.find((item) => item.key === '0-1')!.qty).toBe(1);
    expect(changed.some((item) => item.key === '0-2')).toBe(false);
    expect(changed.at(-1)).toMatchObject({ key: 'add-0', ref: 'egg', qty: 1 });
    const before = perServing(items, 2, foods, undefined)!.per.sodium;
    const after = perServing(changed, 2, foods, undefined)!.per.sodium;
    expect(after).toBeLessThan(before);
  });
});
