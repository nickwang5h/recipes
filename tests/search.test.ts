import { describe, expect, it } from 'vitest';
import { excerpt, search } from '../src/lib/search';
import type { SearchDoc } from '../src/pages/[...lang]/search-index.json';

const doc = (d: Partial<SearchDoc> & Pick<SearchDoc, 't'>): SearchDoc => ({ u: `/x/${d.t}/`, k: 'recipe', s: '', b: '', ...d });

const docs = [
  doc({ t: '红烧茄子', s: '茄子先炸后烧。', i: '茄子 Eggplant 酱油' }),
  doc({ t: '鱼香肉丝', s: '泡椒和糖醋组成鱼香。', i: '猪肉 泡辣椒', b: '没有鱼，也不放鱼露。' }),
  doc({ t: '泰式炒河粉', c: '泰国菜', s: '罗望子、棕榈糖和鱼露。', i: '鱼露 Fish sauce 米粉' }),
  doc({ t: '乳化', k: 'principle', s: '油和水靠乳化剂留在一起。' }),
];

describe('search', () => {
  it('matches Chinese substrings, not whole words', () => {
    expect(search(docs, '鱼露').map((h) => h.doc.t)).toEqual(['泰式炒河粉', '鱼香肉丝']);
  });

  it('ranks title and ingredient matches above body text', () => {
    expect(search(docs, '茄子')[0].doc.t).toBe('红烧茄子');
  });

  it('requires every term and is case-insensitive', () => {
    expect(search(docs, '泰国 鱼露').map((h) => h.doc.t)).toEqual(['泰式炒河粉']);
    expect(search(docs, 'eggplant').map((h) => h.doc.t)).toEqual(['红烧茄子']);
  });

  it('prefers a multi-word query found as a phrase', () => {
    const more = [...docs, doc({ t: '黑鳕鱼', i: 'Black cod fish 酱油 Soy sauce' })];
    expect(search(more, 'fish sauce')[0].doc.t).toBe('泰式炒河粉');
  });

  it('filters by type', () => {
    expect(search(docs, '乳化', 'principle')).toHaveLength(1);
    expect(search(docs, '乳化', 'recipe')).toHaveLength(0);
  });

  it('excerpts the body around a match when the summary lacks it', () => {
    expect(excerpt(docs[1], '鱼露', 3)).toBe('…也不放鱼露。');
  });
});
