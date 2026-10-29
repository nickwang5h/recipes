// The phone's fridge picker: what is in the fridge on top (tap × to take it out), a search box, then
// the commonly used ingredients by kind, one tap to add. The fridge page shows it in place of its
// sidebar; other pages open it as a bottom sheet. Same store keys as the fridge page.
import type { FridgeData } from '../pages/[...lang]/fridge-data.json';
import { pageLang, url } from '../i18n';
import { searchIngredients } from '../lib/fridge';
import { openSheet } from './phone';
import { get, keys, set, subscribe } from './store';
import { el } from './ui';

const FIRST = 12;
let loading: Promise<FridgeData> | undefined;
export const fridgeData = () => (loading ??= fetch(`${url('', pageLang())}fridge-data.json`).then((r) => r.json()));

export function mountPicker(host: HTMLElement, data: FridgeData): () => void {
  const { words } = data;
  const name = (id: string) => data.ingredients[id]?.[0] ?? id;
  const isStaple = (id: string) => data.staples.includes(id);
  const stocked = () => keys('have:').filter((id) => id in data.ingredients && !isStaple(id));
  const opened = new Set<number>();
  const chip = (id: string, text = name(id)) => {
    const b = el('button', { type: 'button', className: 'chip', textContent: text });
    b.dataset.id = id;
    return b;
  };

  const have = el('div', { className: 'pick-have' });
  const empty = el('p', { className: 'fridge-empty', textContent: words.empty });
  const input = document.createElement('input');
  Object.assign(input, { type: 'search', placeholder: words.placeholder, autocomplete: 'off' });
  input.setAttribute('aria-label', words.search);
  const search: HTMLLabelElement = el('label', { className: 'pick-search' }, input);
  const suggest = el('div', { className: 'pick-cloud pick-suggest' });
  const groups = el('div', { className: 'pick-groups' });
  host.replaceChildren(have, empty, search, suggest, groups);

  const render = () => {
    // Redrawing replaces the chips; keep keyboard focus on the same ingredient where it still shows.
    const focused = host.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.id : undefined;
    queueMicrotask(() => {
      if (focused && !host.contains(document.activeElement)) host.querySelector<HTMLElement>(`[data-id="${focused}"]`)?.focus();
    });
    const mine = stocked();
    have.replaceChildren(...mine.map((id) => {
      const b = chip(id, `${name(id)} ×`);
      b.dataset.out = '';
      return b;
    }));
    empty.hidden = mine.length > 0;
    const hits = searchIngredients(Object.entries(data.ingredients).map(([id, [, names]]) => ({ id, names })), input.value, 8);
    suggest.replaceChildren(...hits.map((h) => chip(h.id)));
    const kinds = data.kinds.map((k, n) => {
      const left = k.ids.filter((id) => !mine.includes(id));
      if (!left.length) return null;
      const shown = opened.has(n) ? left : left.slice(0, FIRST);
      const cloud = el('div', { className: 'pick-cloud' }, ...shown.map((id) => chip(id)));
      if (shown.length < left.length) {
        const more = el('button', { type: 'button', className: 'chip pick-more', textContent: words.more });
        more.dataset.kind = String(n);
        cloud.append(more);
      }
      return el('section', {}, el('h3', { textContent: k.label }), cloud);
    });
    // Staples count as on hand; tapping one says it has run out.
    const staples = el('div', { className: 'pick-cloud' }, ...data.staples.map((id) => {
      const b = chip(id);
      b.dataset.staple = '';
      b.setAttribute('aria-pressed', String(get('staple-off:' + id) !== true));
      return b;
    }));
    groups.replaceChildren(...kinds.filter((k): k is HTMLElement => !!k), el('section', {}, el('h3', { textContent: words.staples }), staples));
  };

  host.addEventListener('click', (event) => {
    const b = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (!b || !host.contains(b)) return;
    if (b.dataset.kind) {
      opened.add(Number(b.dataset.kind));
      return render();
    }
    const id = b.dataset.id;
    if (!id) return;
    if (b.dataset.staple !== undefined) set('staple-off:' + id, get('staple-off:' + id) === true ? null : true);
    else if (b.dataset.out !== undefined) set('have:' + id, null);
    else {
      set('have:' + id, true);
      if (input.value) {
        input.value = '';
        input.focus();
      }
    }
  });
  input.addEventListener('input', render);
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    suggest.querySelector<HTMLButtonElement>('button')?.click();
  });
  const stop = subscribe(render);
  render();
  return stop;
}

/** The picker as a sheet, from the recipe list, a recipe's ingredients, or the draw. */
let opening = false;

export async function openFridge(title: string, done: string) {
  if (opening) return;
  opening = true;
  let data: FridgeData;
  try {
    data = await fridgeData();
  } catch {
    // Offline with nothing saved: the fridge page itself.
    loading = undefined;
    location.assign(url('fridge', pageLang()));
    return;
  } finally {
    opening = false;
  }
  let stop = () => {};
  const sheet = openSheet({ title, done, className: 'sheet-fridge', onClose: () => stop() });
  stop = mountPicker(sheet.body, data);
}
