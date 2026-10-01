import { describe, expect, it } from 'vitest';
import { related } from '../src/lib/related';

const r = (id: string, cuisine: string, course: string, principles: string[], ingredients: string[]) => ({ id, cuisine, course, principles, ingredients });

const hongShaoRou = r('hong-shao-rou', 'chinese', 'meat', ['caramelization', 'collagen-gelatin'], ['pork-belly', 'rock-sugar', 'shaoxing-wine', 'ginger']);
const all = [
  hongShaoRou,
  r('mei-cai-kou-rou', 'chinese', 'meat', ['collagen-gelatin'], ['pork-belly', 'mei-cai', 'ginger']),
  r('thit-kho-trung', 'vietnamese', 'meat', ['collagen-gelatin', 'caramelization'], ['pork', 'egg', 'fish-sauce']),
  r('tomato-egg', 'chinese', 'veg', ['protein-coagulation'], ['tomato', 'egg', 'ginger']),
  r('creme-caramel', 'french', 'dessert', ['caramelization', 'protein-coagulation'], ['sugar', 'egg', 'whole-milk']),
];

describe('related', () => {
  it('puts a shared main ingredient first', () => {
    expect(related(hongShaoRou, all)[0].id).toBe('mei-cai-kou-rou');
  });

  it('also finds dishes that hinge on the same principles', () => {
    expect(related(hongShaoRou, all).map((x) => x.id)).toContain('thit-kho-trung');
  });

  it('ignores staples and aromatics when matching ingredients', () => {
    expect(related(hongShaoRou, all).map((x) => x.id)).not.toContain('tomato-egg');
  });

  it('keeps desserts apart from main dishes', () => {
    const tiramisu = r('tiramisu', 'italian', 'dessert', ['emulsification'], ['mascarpone', 'egg']);
    const pasta = r('cacio-e-pepe', 'italian', 'staple', ['emulsification', 'starch-gelatinization'], ['spaghetti']);
    expect(related(tiramisu, [tiramisu, pasta])).toEqual([]);
  });

  it('never returns the recipe itself and respects the limit', () => {
    const out = related(hongShaoRou, all, 1);
    expect(out).toHaveLength(1);
    expect(out[0].id).not.toBe('hong-shao-rou');
  });
});
