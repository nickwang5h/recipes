// The shopping list, shared by the fridge and the weekly menu and synced with the family.
// Each item is stored as `list:<ingredient id>` → { for: recipe titles, bought }.
import { joinList, pageLang } from '../i18n';
import { DEFAULT_STAPLES } from '../lib/fridge';
import { grouped, toText, type CatalogInfo, type ListItem } from '../lib/shopping';
import { get, keys, set, setMany, subscribe } from './store';
import { el, flash } from './ui';

type Stored = { for: string[]; bought: boolean };

const T = {
  zh: { count: (n: number) => `· ${n} 样`, for: '用于：', copied: '已复制', copyFailed: '复制失败，请手动选择文字', stocked: (n: number) => `${n} 样放进了冰箱`, tickFirst: '先勾选买到的', clear: '清空购物清单？' },
  en: { count: (n: number) => `· ${n}`, for: 'For: ', copied: 'Copied', copyFailed: 'Couldn’t copy; select the text by hand', stocked: (n: number) => `${n} put in the fridge`, tickFirst: 'Tick what you bought first', clear: 'Clear the shopping list?' },
};

export function listItems(): ListItem[] {
  return keys('list:').map((id) => ({ id, ...get<Stored>(`list:${id}`)! }));
}

/** Adds what a recipe is missing; an item already on the list just gains the recipe. */
export function addToList(recipe: string, ids: string[]) {
  const changes: Record<string, Stored> = {};
  for (const id of ids) {
    const item = get<Stored>(`list:${id}`);
    if (item?.for.includes(recipe)) continue;
    changes[`list:${id}`] = item ? { ...item, for: [...item.for, recipe] } : { for: [recipe], bought: false };
  }
  if (Object.keys(changes).length) setMany(changes);
}

export const isListed = (recipe: string, ids: string[]) => ids.every((id) => get<Stored>(`list:${id}`)?.for.includes(recipe));

/** Puts bought items in the fridge (or back among the staples) and takes them off the list. */
function stockBought(): number {
  const bought = listItems().filter((i) => i.bought);
  const changes: Record<string, unknown> = {};
  for (const item of bought) {
    changes[`list:${item.id}`] = null;
    if (DEFAULT_STAPLES.includes(item.id)) changes[`staple-off:${item.id}`] = null;
    else changes[`have:${item.id}`] = true;
  }
  if (bought.length) setMany(changes);
  return bought.length;
}

/** Wires up the markup from ShoppingList.astro and keeps it current. */
export function mountShoppingList(catalog: Map<string, CatalogInfo>) {
  const wrap = document.querySelector<HTMLDetailsElement>('[data-list-wrap]');
  if (!wrap) return;
  const $ = <E extends HTMLElement>(sel: string) => wrap.querySelector<E>(sel)!;
  const status = $('[data-list-status]');
  const lang = pageLang();
  const t = T[lang];

  const render = () => {
    const list = listItems().filter((i) => catalog.has(i.id));
    wrap.hidden = list.length === 0;
    $('[data-list-count]').textContent = t.count(list.filter((i) => !i.bought).length);
    $('[data-list]').replaceChildren(
      ...grouped(list, catalog, lang).map((group) => {
        const ul: HTMLUListElement = el('ul', { className: 'ingredients' });
        ul.append(
          ...group.items.map((item) => {
            const info = catalog.get(item.id)!;
            const box = document.createElement('input');
            box.type = 'checkbox';
            box.checked = item.bought;
            box.addEventListener('change', () => set(`list:${item.id}`, { for: item.for, bought: box.checked }));
            const text: HTMLSpanElement = el('span', { className: 'ing-text' });
            // Each language adds the other's name where it helps at the shop.
            const aside = lang === 'zh' ? info.en : info.where === 'asian' ? info.zh : '';
            text.append(el('span', { className: 'ing-name', textContent: info[lang] }));
            if (aside) text.append(el('span', { className: 'ing-en', textContent: aside }));
            text.append(el('span', { className: 'ing-note', textContent: `${t.for}${joinList(item.for, lang)}` }));
            const label = document.createElement('label');
            label.className = 'ing-row';
            label.append(box, text);
            const li: HTMLLIElement = el('li');
            li.append(label);
            return li;
          }),
        );
        const div: HTMLDivElement = el('div', { className: 'shopping-group' });
        div.append(el('h3', { textContent: group.label }), ul);
        return div;
      }),
    );
  };

  $('[data-list-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(toText(listItems(), catalog, lang));
      flash(status, t.copied);
    } catch {
      flash(status, t.copyFailed);
    }
  });
  $('[data-list-stock]').addEventListener('click', () => {
    const n = stockBought();
    flash(status, n ? t.stocked(n) : t.tickFirst);
  });
  $('[data-list-clear]').addEventListener('click', () => {
    if (!confirm(t.clear)) return;
    setMany(Object.fromEntries(keys('list:').map((id) => [`list:${id}`, null])));
  });

  subscribe(render);
  render();
}
