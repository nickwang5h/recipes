// Search results as you type, for /search/ and the box at the top of 菜谱.
import type { SearchDoc } from '../pages/[...lang]/search-index.json';
import { pageLang, url } from '../i18n';
import { search, terms, type SearchHit } from '../lib/search';

const lang = pageLang();
const T = {
  zh: { kinds: { recipe: '菜谱', principle: '原理', cuisine: '菜系' }, failed: '搜索索引加载失败，请检查网络。', count: (n: number, page: number) => `${n} 条结果${n > page ? `，显示前 ${page} 条` : ''}` },
  en: { kinds: { recipe: 'Recipe', principle: 'Science', cuisine: 'Cuisine' }, failed: 'Couldn’t load the search index; check your connection.', count: (n: number, page: number) => `${n} ${n === 1 ? 'result' : 'results'}${n > page ? `, showing the first ${page}` : ''}` },
}[lang];
const PAGE = 30;
let docs: Promise<SearchDoc[]> | undefined;
export const loadIndex = () =>
  (docs ??= fetch(`${url('', lang)}search-index.json`).then((r) => r.json()).catch((e) => {
    docs = undefined;
    throw e;
  }));

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}) =>
  Object.assign(document.createElement(tag), props);

/** Text with every query term wrapped in <mark>, built from DOM nodes so nothing is parsed as HTML. */
const highlighted = (text: string, qs: string[]) => {
  const p = el('p', { className: 'search-excerpt' });
  const pattern = new RegExp(`(${qs.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  for (const part of text.split(pattern)) {
    if (!part) continue;
    p.append(qs.includes(part.toLowerCase()) ? el('mark', { textContent: part }) : document.createTextNode(part));
  }
  return p;
};

const row = (hit: SearchHit, qs: string[]) => {
  const { doc } = hit;
  const a = el('a', { className: 'search-hit', href: doc.u });
  if (doc.img) a.append(el('img', { src: doc.img, alt: '', loading: 'lazy', width: 96, height: 64 }));
  const text = el('div');
  text.append(el('span', { className: 'search-title', textContent: doc.t }));
  text.append(el('span', { className: 'search-kind', textContent: [T.kinds[doc.k], doc.c].filter(Boolean).join(' · ') }));
  text.append(highlighted(hit.excerpt, qs));
  a.append(text);
  const li = el('li');
  li.append(a);
  return li;
};

interface Parts {
  input: HTMLInputElement;
  list: HTMLElement;
  count: HTMLElement;
  none: HTMLElement;
  /** Called with whether a query is showing, e.g. to hide what the results replace. */
  onShow?: (showing: boolean) => void;
}

/** Runs the search on each keystroke and keeps ?q= in the address. Returns a function to rerun with a type filter. */
export function mountSearch({ input, list, count, none, onShow }: Parts) {
  let type = '';
  const run = async () => {
    const q = input.value.trim();
    const here = new URL(location.href);
    q ? here.searchParams.set('q', q) : here.searchParams.delete('q');
    history.replaceState(history.state, '', here);
    onShow?.(!!q);
    if (!q) {
      list.replaceChildren();
      count.textContent = '';
      none.hidden = true;
      return;
    }
    let all: SearchDoc[];
    try {
      all = await loadIndex();
    } catch {
      count.textContent = T.failed;
      return;
    }
    if (input.value.trim() !== q) return;
    const hits = search(all, q, type, lang);
    count.textContent = hits.length ? T.count(hits.length, PAGE) : '';
    none.hidden = hits.length > 0;
    const qs = terms(q);
    list.replaceChildren(...hits.slice(0, PAGE).map((hit) => row(hit, qs)));
  };
  let timer = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = window.setTimeout(run, 120);
  });
  input.value = new URLSearchParams(location.search).get('q') ?? '';
  if (input.value) void run();
  return (next: string) => {
    type = next;
    void run();
  };
}
