import { describe, expect, it } from 'vitest';
import { addMissing, grouped, toText, type CatalogInfo } from '../src/lib/shopping';

const catalog = new Map<string, CatalogInfo>([
  ['holy-basil', { zh: '圣罗勒', en: 'Holy basil', where: 'specialty' }],
  ['shallot', { zh: '红葱头', en: 'Shallots', where: 'mainstream' }],
  ['fish-sauce', { zh: '鱼露', en: 'Fish sauce', where: 'asian' }],
]);

describe('shopping list', () => {
  it('merges the same ingredient across recipes', () => {
    let list = addMissing([], '打抛猪肉饭', ['holy-basil', 'shallot']);
    list = addMissing(list, '泰式炒河粉', ['shallot', 'fish-sauce']);
    list = addMissing(list, '泰式炒河粉', ['shallot']);
    expect(list.map((i) => [i.id, i.for])).toEqual([
      ['holy-basil', ['打抛猪肉饭']],
      ['shallot', ['打抛猪肉饭', '泰式炒河粉']],
      ['fish-sauce', ['泰式炒河粉']],
    ]);
  });

  it('groups by store in a fixed order', () => {
    const list = addMissing([], 'x', ['holy-basil', 'shallot', 'fish-sauce']);
    expect(grouped(list, catalog).map((g) => g.label)).toEqual(['主流超市', '亚洲超市', '专门店']);
  });

  it('writes unbought items as text', () => {
    const list = addMissing([], '打抛猪肉饭', ['holy-basil', 'shallot']);
    list[1].bought = true;
    expect(toText(list, catalog)).toBe('购物清单\n\n【专门店】\n- 圣罗勒（Holy basil）— 打抛猪肉饭');
  });
});
