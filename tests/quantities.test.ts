// Amounts the page can show as written. src/lib/scale.ts never shows less than 0.5 of a counted thing or
// 0.25 of a spoon (0.1 g or ml), so a smaller qty prints as more than the recipe means, while nutrition
// still counts the real number. The writing guide asks for counts to 0.5 and spoons to 0.25.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { roundQty } from '../src/lib/scale';

const dir = new URL('../src/content/recipes/zh/', import.meta.url);

/** The smallest amount the page shows for a unit (0 when it has none). */
const smallest = (unit?: string) => roundQty(0.0001, unit);

// Known exceptions, written before this test: each shows more than it means (0.25 个 as 0.5, 0.125 茶匙
// as 0.25). Left for the owner to decide how to rewrite each amount (a larger unit, a pinch in the
// note, the dish for more people…); remove a recipe from here once it is fixed. Nothing new joins it.
const KNOWN: Record<string, string[]> = {
  'cheng-bao-dan': ['onion 0.25 个'],
  'hei-jiao-niu-liu': ['onion 0.25 个', 'bell-pepper 0.25 个'],
  'hong-shao-yu-tou': ['long-red-chili 0.25 个'],
  'liang-ban-wo-sun': ['daikon 0.25 根'],
  'song-shu-gui-yu': ['white-pepper 0.125 茶匙', 'white-pepper 0.125 茶匙'],
  'suan-xiang-huang-you-xia': ['lemon 0.25 个'],
  'yaki-gyoza': ['black-pepper 0.125 茶匙'],
  'zhong-shi-xian-bing': ['leek 0.25 根'],
};

describe('ingredient amounts', () => {
  it('knows the smallest amount per unit', () => {
    expect([smallest('个'), smallest(undefined), smallest('茶匙'), smallest('汤匙'), smallest('g'), smallest('kg')]).toEqual([0.5, 0.5, 0.25, 0.25, 0.1, 0]);
  });

  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const below = new Map<string, string[]>();
  for (const file of files) {
    const front = parse(readFileSync(new URL(file, dir), 'utf8').match(/^---\n([\s\S]*?)\n---/)![1]);
    for (const group of front.ingredients) {
      for (const item of group.items) {
        if (typeof item.qty === 'number' && item.qty < smallest(item.unit)) {
          below.set(file.slice(0, -3), [...(below.get(file.slice(0, -3)) ?? []), `${item.ref} ${item.qty} ${item.unit ?? ''}`.trim()]);
        }
      }
    }
  }

  it('has no amount below what the page can show', () => {
    // The known lines, and nothing more, in the known recipes.
    const fresh = Object.fromEntries([...below].filter(([slug, lines]) => JSON.stringify(lines) !== JSON.stringify(KNOWN[slug])));
    expect(fresh, 'round counts to 0.5 and spoons to 0.25, or move the amount into the note').toEqual({});
  });

  it('lists no recipe as a known exception once it is fixed', () => {
    expect(Object.keys(KNOWN).filter((slug) => !below.has(slug))).toEqual([]);
  });
});
