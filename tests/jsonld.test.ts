import { describe, expect, it } from 'vitest';
import { recipeLd, steps } from '../src/lib/jsonld';

const body = `开头一段，见[乳化](/principles/emulsification/)。

## 步骤

1. 把**黄油**切块，冷藏。
2. 按[蛋黄酱](/recipes/mayonnaise/)的方法慢慢加油。

## 要点

- **分层**：加油太快。
`;

describe('steps', () => {
  it('takes only the numbered list under 步骤 and strips markdown', () => {
    expect(steps(body)).toEqual(['把黄油切块，冷藏。', '按蛋黄酱的方法慢慢加油。']);
  });
});

describe('recipeLd', () => {
  const ld = recipeLd({
    url: 'https://example.com/recipes/x/',
    title: '黄油白酱',
    summary: '摘要',
    cuisine: '法餐',
    course: '酱汁',
    servings: 4,
    time: { prep: 10, cook: 15 },
    ingredients: [
      { qty: 250, unit: 'g', name: '黄油', note: '冷藏' },
      { name: '盐', note: '适量' },
      { qty: 2, unit: '个', name: '红葱头' },
    ],
    body,
    keywords: ['乳化'],
    updated: new Date('2026-10-01'),
    site: { name: '厨房原理笔记', url: 'https://example.com/' },
  });

  it('formats ISO durations and the yield', () => {
    expect(ld.prepTime).toBe('PT10M');
    expect(ld.totalTime).toBe('PT25M');
    expect(ld.recipeYield).toBe('4 人份');
  });

  it('writes ingredients as readable lines', () => {
    expect(ld.recipeIngredient).toEqual(['250 g 黄油（冷藏）', '盐（适量）', '2 个 红葱头']);
  });

  it('numbers the steps', () => {
    expect(ld.recipeInstructions[1]).toEqual({ '@type': 'HowToStep', position: 2, text: '按蛋黄酱的方法慢慢加油。' });
  });

  it('omits image when there is none', () => {
    expect('image' in ld).toBe(false);
  });
});
