// Substring search over the index built by src/pages/search-index.json.ts.
// Every whitespace-separated term must appear somewhere in the document; fields
// that say more about what the page is (title, ingredients) weigh more than body text.
import type { SearchDoc } from '../pages/[...lang]/search-index.json';

const WEIGHTS: [keyof SearchDoc, number][] = [
  ['t', 10],
  ['o', 4],
  ['i', 5],
  ['c', 3],
  ['p', 3],
  ['s', 3],
  ['b', 1],
];

export interface SearchHit {
  doc: SearchDoc;
  score: number;
  excerpt: string;
}

export function terms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

export function search(docs: SearchDoc[], query: string, type = '', lang: 'zh' | 'en' = 'zh'): SearchHit[] {
  const qs = terms(query);
  if (!qs.length) return [];
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    if (type && doc.k !== type) continue;
    let score = 0;
    let all = true;
    for (const q of qs) {
      let termScore = 0;
      for (const [field, weight] of WEIGHTS) {
        const value = (doc[field] as string | undefined)?.toLowerCase();
        if (!value?.includes(q)) continue;
        termScore += weight;
        if (field === 't' && value.startsWith(q)) termScore += 5;
      }
      if (!termScore) {
        all = false;
        break;
      }
      score += termScore;
    }
    if (!all) continue;
    // A multi-word query found as one phrase ("fish sauce") beats scattered words.
    const phrase = qs.join(' ');
    if (qs.length > 1) {
      for (const [field, weight] of WEIGHTS) {
        if ((doc[field] as string | undefined)?.toLowerCase().includes(phrase)) score += weight * 2;
      }
    }
    hits.push({ doc, score, excerpt: excerpt(doc, qs[0]) });
  }
  return hits.sort((a, b) => b.score - a.score || a.doc.t.localeCompare(b.doc.t, lang));
}

/** The summary when it mentions the term, otherwise a short window of body text around it. */
export function excerpt(doc: SearchDoc, term: string, radius = 36): string {
  if (doc.s.toLowerCase().includes(term)) return doc.s;
  const at = doc.b.toLowerCase().indexOf(term);
  if (at < 0) return doc.s;
  const start = Math.max(0, at - radius);
  const end = Math.min(doc.b.length, at + term.length + radius);
  return (start > 0 ? '…' : '') + doc.b.slice(start, end) + (end < doc.b.length ? '…' : '');
}
