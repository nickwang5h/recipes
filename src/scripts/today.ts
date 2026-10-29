// 今天: tonight's dishes with what they still need, what the fridge can make, and the week ahead.
// Everything lives in the shared store (menu:<day>, have:, list:), so it follows the family.
import type { RecipeData, SiteData } from '../pages/[...lang]/recipes-data.json';
import { joinList, pageLang } from '../i18n';
import { dayKey, upcoming } from '../lib/days';
import { SLOTS, suggestDish, suggestTable, type MenuRecipe, type SlotId } from '../lib/menu';
import { openDraw } from './draw';
import { openFridge } from './fridge-picker';
import { phone, toast } from './phone';
import { addToList, isListed } from './shopping-list';
import { forDinner, missing, siteData } from './site-data';
import { get, keys, set, subscribe } from './store';
import { el, PLATE, recipeCard } from './ui';

const lang = pageLang();
const T = {
  zh: {
    weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], today: '今天', tomorrow: '明天',
    date: (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日 ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]}`,
    swap: '换', remove: (t: string) => `从菜单去掉${t}`, need: (n: number) => `缺 ${n} 样`, ready: '都有', needList: (names: string) => `缺 ${names}`,
    listed: (n: number) => `缺 ${n} 样 · 已在清单`, toList: '加到清单', list: '清单', allSet: '都齐了', cook: '开做', added: (n: number) => `加了 ${n} 样到清单`,
    table: '配一桌', add: '加菜', nothing: '还没安排', fridge: '冰箱', ok: '好', offline: '没连上网，稍后再试',
  },
  en: {
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], today: 'Today', tomorrow: 'Tomorrow',
    date: (d: Date) => d.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }),
    swap: 'Swap', remove: (t: string) => `Take ${t} off the menu`, need: (n: number) => `${n} to buy`, ready: 'All in', needList: (names: string) => `Need ${names}`,
    listed: (n: number) => `${n} to buy · on the list`, toList: 'Add to list', list: 'List', allSet: 'All set', cook: 'Start', added: (n: number) => `Added ${n} to the list`,
    table: 'Set a table', add: 'Add a dish', nothing: 'Nothing planned', fridge: 'Fridge', ok: 'Done', offline: 'No connection; try again in a moment',
  },
}[lang];

const root = document.querySelector<HTMLElement>('[data-today]')!;
const $ = <E extends HTMLElement>(sel: string) => root.querySelector<E>(sel)!;
const today = new Date();
const days = upcoming(today);
const menuOf = (i: number) => get<string[]>('menu:' + dayKey(days[i])) ?? [];
const setMenu = (i: number, ids: string[]) => set('menu:' + dayKey(days[i]), ids.length ? ids : null);
const dayName = (i: number) => (i === 0 ? T.today : i === 1 ? T.tomorrow : T.weekday[days[i].getDay()]);
let openDay = 0;

$('[data-today-date]').textContent = T.date(today);

const slotOf = (r: RecipeData) => SLOTS.find((s) => (s.courses as readonly string[]).includes(r.course));
const thumb = (r: RecipeData) => {
  if (r.img) return Object.assign(document.createElement('img'), { className: 'dish-thumb', src: r.img, alt: '', loading: 'lazy', width: 96, height: 96 });
  const ph = el('span', { className: 'dish-thumb card-ph', innerHTML: PLATE });
  ph.setAttribute('aria-hidden', 'true');
  return ph;
};

function suggestOptions(i: number) {
  const planned = new Set(days.flatMap((_, j) => menuOf(j)));
  return { favorites: new Set(keys('fav:')), planned, maxMinutes: 60, month: days[i].getMonth() + 1 };
}

function render(data: SiteData) {
  const byId = new Map(data.recipes.map((r) => [r.id, r]));
  const name = (id: string) => (lang === 'en' ? data.ingredients[id]?.en : data.ingredients[id]?.zh) ?? id;
  const dishes = data.recipes.filter(forDinner) as (RecipeData & MenuRecipe)[];

  // ---- Tonight
  const tonight = menuOf(0).map((id) => byId.get(id)).filter((r): r is RecipeData => !!r);
  $('[data-tonight-empty]').hidden = tonight.length > 0;
  $('[data-tonight]').hidden = tonight.length === 0;
  $('[data-tonight-foot]').hidden = tonight.length === 0;
  const need = new Map<string, string[]>();
  $('[data-tonight]').replaceChildren(...tonight.map((r) => {
    const miss = missing(r, data);
    for (const id of miss) need.set(r.title, [...(need.get(r.title) ?? []), id]);
    const swap = el('button', { type: 'button', className: 'text-btn dish-swap', textContent: T.swap });
    swap.addEventListener('click', () => {
      const slot = (slotOf(r)?.id ?? 'main') as SlotId;
      const next = suggestDish(dishes, slot, { ...suggestOptions(0), cuisine: r.cuisine }, new Set([r.id]));
      if (next) setMenu(0, menuOf(0).map((id) => (id === r.id ? next.id : id)));
    });
    return el('li', { className: 'dish' },
      el('a', { className: 'dish-link', href: r.href }, thumb(r),
        el('span', { className: 'dish-text' },
          el('span', { className: 'dish-slot', textContent: slotOf(r)?.label[lang] ?? '' }),
          el('span', { className: 'dish-title', textContent: r.title }),
          el('span', { className: 'dish-meta' }, el('span', { textContent: r.time }),
            el('span', { className: miss.length ? 'is-need' : 'is-have', textContent: miss.length ? T.need(miss.length) : T.ready })))),
      swap);
  }));
  const ids = [...new Set([...need.values()].flat())];
  const listed = [...need].every(([title, list]) => isListed(title, list));
  const foot: HTMLElement[] = [];
  if (!ids.length) foot.push(el('span', { className: 'is-have', textContent: T.allSet }), el('a', { className: 'home-lucky', href: tonight[0]?.href ?? '#', textContent: T.cook }));
  else if (listed) foot.push(el('span', { className: 'tonight-need', textContent: T.listed(ids.length) }), el('a', { className: 'text-btn', href: document.querySelector<HTMLAnchorElement>('[data-tab="list"]')?.href ?? '/list/', textContent: T.list }));
  else {
    const add = el('button', { type: 'button', className: 'home-lucky', textContent: T.toList });
    add.addEventListener('click', () => {
      const before = ids.filter((id) => !get(`list:${id}`)).length;
      for (const [title, list] of need) addToList(title, list);
      toast(T.added(before));
    });
    foot.push(el('span', { className: 'tonight-need is-need', textContent: T.needList(joinList(ids.map(name), lang)) }), add);
  }
  $('[data-tonight-foot]').replaceChildren(...foot);

  // ---- Fridge: what is in it, and the dishes it is closest to.
  const stocked = keys('have:').filter((id) => id in data.ingredients && !data.staples.includes(id));
  $('[data-fridge-have]').replaceChildren(...stocked.map((id) => el('li', { textContent: name(id) })));
  $('[data-fridge-empty]').hidden = stocked.length > 0;
  const have = new Set(stocked);
  const matches = stocked.length ? dishes
    .map((r) => ({ r, miss: missing(r, data), used: r.req.filter((id) => have.has(id)).length }))
    .filter((m) => m.used > 0 && m.miss.length <= 2)
    .sort((a, b) => a.miss.length - b.miss.length || b.used - a.used || a.r.minutes - b.r.minutes)
    .slice(0, 12) : [];
  $('[data-matches]').replaceChildren(...matches.map(({ r, miss }) => el('li', {}, recipeCard(r, data.cuisines[r.cuisine],
    [el('p', { className: miss.length ? 'fridge-missing' : 'today-ready', textContent: miss.length ? T.needList(joinList(miss.map(name), lang)) : T.ready })]))));

  // ---- The week: seven days; on phones one opens below the strip, on wide screens all show.
  $('[data-week]').replaceChildren(...days.map((d, i) => {
    const list = menuOf(i).map((id) => byId.get(id)).filter((r): r is RecipeData => !!r);
    const head = el('button', { type: 'button', className: 'day-head' },
      el('span', { className: 'day-name', textContent: dayName(i) }),
      el('b', { textContent: String(d.getDate()) }),
      el('span', { className: 'day-dots' }, ...list.slice(0, 3).map(() => el('i'))));
    head.setAttribute('aria-expanded', String(openDay === i));
    head.addEventListener('click', () => { openDay = i; render(data); });
    const body = el('div', { className: 'day-body' });
    const ul = el('ul', { className: 'day-dishes' }, ...list.map((r) => {
      const x = el('button', { type: 'button', className: 'day-remove', textContent: '×' });
      x.setAttribute('aria-label', T.remove(r.title));
      x.addEventListener('click', () => setMenu(i, menuOf(i).filter((id) => id !== r.id)));
      return el('li', {}, el('a', { href: r.href, textContent: r.title }), x);
    }));
    if (!list.length) ul.append(el('li', { className: 'day-empty', textContent: T.nothing }));
    const table = el('button', { type: 'button', className: 'text-btn', textContent: T.table });
    table.addEventListener('click', () => {
      const t = suggestTable(dishes, suggestOptions(i));
      setMenu(i, [...menuOf(i), ...Object.values(t).map((r) => r!.id)]);
    });
    const add = el('button', { type: 'button', className: 'text-btn', textContent: T.add });
    add.addEventListener('click', () => void openDraw(i, dayName(i)));
    body.append(ul, el('div', { className: 'day-acts' }, table, add));
    return el('li', { className: `day${i === 0 ? ' is-today' : ''}${openDay === i ? ' is-open' : ''}` }, head, body);
  }));
}

// The empty tonight card works before the data arrives: 今晚吃什么 and 配一桌.
root.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const draw = target.closest('[data-draw]');
  if (draw) {
    event.preventDefault();
    void openDraw();
    return;
  }
  const fridge = target.closest<HTMLElement>('[data-fridge-edit]');
  if (fridge && phone.matches) {
    event.preventDefault();
    void openFridge(fridge.dataset.title ?? T.fridge, T.ok);
    return;
  }
  if (target.closest('[data-table]')) {
    void siteData().then((data) => {
      const dishes = data.recipes.filter(forDinner) as (RecipeData & MenuRecipe)[];
      const t = suggestTable(dishes, suggestOptions(0));
      setMenu(0, Object.values(t).map((r) => r!.id));
    }).catch(() => toast(T.offline));
  }
});

siteData().then((data) => {
  subscribe(() => render(data));
  render(data);
}).catch(() => {});
