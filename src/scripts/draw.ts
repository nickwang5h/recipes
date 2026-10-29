// 今晚吃什么 on phones: one recipe card at a time on a full-screen sheet. 换一个 (or a swipe left)
// draws another; 就它 puts the dish on today's menu and closes the sheet, without leaving the page.
// The pool follows the recipe list's rule: no small sides, sweets, drinks or sauces, nothing over three hours.
import type { RecipeData, SiteData } from '../pages/[...lang]/recipes-data.json';
import { pageLang } from '../i18n';
import { TAGS } from '../lib/categories';
import { addDays, dayKey } from '../lib/days';
import { openFridge } from './fridge-picker';
import { openSheet, popLayer, toast, touch } from './phone';
import { forDinner, missing as missingOf, siteData } from './site-data';
import { get, keys, set, subscribe } from './store';
import { el, PLATE } from './ui';

const lang = pageLang();
const T = {
  zh: { title: '今晚', fridge: '冰箱里有', quick: '30 分钟内', again: '换一个', take: '就它', added: '已放进今天的菜单', addedDay: (day: string) => `已放进${day}的菜单`, offline: '没连上网，稍后再试', empty: '没有符合条件的菜谱。', fridgeTitle: '冰箱', ok: '好' },
  en: { title: 'Tonight', fridge: 'From my fridge', quick: 'Under 30 min', again: 'Another one', take: 'This one', added: 'Added to today’s menu', addedDay: (day: string) => `Added to ${day}’s menu`, offline: 'No connection; try again in a moment', empty: 'No recipes match these filters.', fridgeTitle: 'Fridge', ok: 'Done' },
}[lang];
const FILTERS = [
  { id: 'fridge', label: T.fridge },
  { id: 'quick', label: T.quick },
  { id: 'one-pot', label: TAGS['one-pot'][lang] },
  { id: 'bento', label: TAGS.bento[lang] },
] as const;

let opening = false;

/** One card at a time; 就它 puts the dish on a day's menu (today unless a day is given, 0 = today). */
export async function openDraw(day = 0, dayName?: string) {
  // A second tap while the data is still coming is ignored.
  if (opening) return;
  opening = true;
  let data: SiteData;
  try {
    data = await siteData();
  } catch {
    toast(T.offline);
    return;
  } finally {
    opening = false;
  }
  const on = new Set<string>();
  let queue: RecipeData[] = [];
  let current: RecipeData | undefined;

  const missing = (r: RecipeData) => missingOf(r, data);
  const pool = () => {
    const stocked = new Set(keys('have:'));
    return data.recipes.filter((r: RecipeData) =>
      forDinner(r)
      && (!on.has('quick') || r.minutes <= 30)
      && (!on.has('one-pot') || r.tags.includes('one-pot'))
      && (!on.has('bento') || r.tags.includes('bento'))
      && (!on.has('fridge') || (r.req.some((id: string) => stocked.has(id)) && missing(r).length <= 1)));
  };
  const refill = () => {
    queue = pool().sort(() => Math.random() - 0.5);
  };

  const sheet = openSheet({ title: dayName ?? T.title, full: true, className: 'sheet-draw', onClose: () => stop() });
  const chips = el('div', { className: 'draw-filters' }, ...FILTERS.map((f) => {
    const b = el('button', { type: 'button', className: 'chip', textContent: f.label });
    b.dataset.filter = f.id;
    b.setAttribute('aria-pressed', 'false');
    return b;
  }));
  const stage = el('div', { className: 'draw-stage' });
  stage.setAttribute('aria-live', 'polite');
  const again = el('button', { type: 'button', className: 'draw-again', textContent: T.again });
  const take = el('button', { type: 'button', className: 'draw-take', textContent: T.take });
  const foot = el('div', { className: 'draw-foot' }, again, take);
  sheet.body.append(chips, stage);
  sheet.root.append(foot);

  const render = () => {
    if (!current) {
      take.disabled = true;
      stage.replaceChildren(el('p', { className: 'fridge-empty', textContent: T.empty }));
      return;
    }
    take.disabled = false;
    const r = current;
    const cuisine = data.cuisines[r.cuisine];
    const card = el('a', { className: `index-card draw-card accent-${cuisine?.accent ?? 'red'}`, href: r.href });
    card.append(el('span', { className: 'tape' }));
    if (r.img) card.append(Object.assign(document.createElement('img'), { src: r.img, alt: '', width: 480, height: 360 }));
    else card.append(el('span', { className: 'draw-ph', innerHTML: PLATE }));
    card.append(
      el('h3', { textContent: r.title }),
      el('p', { className: 'meta' }, el('span', { className: 'cuisine-tag', textContent: cuisine?.title ?? '' }), el('span', { textContent: r.time })),
      el('p', { className: 'draw-summary', textContent: r.summary }),
    );
    stage.replaceChildren(card);
  };
  const draw = () => {
    if (!queue.length) refill();
    // Not the same dish twice in a row.
    if (queue[0]?.id === current?.id && queue.length > 1) queue.push(queue.shift()!);
    current = queue.shift();
    render();
  };

  chips.addEventListener('click', (event) => {
    const b = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-filter]');
    if (!b) return;
    const id = b.dataset.filter!;
    on.has(id) ? on.delete(id) : on.add(id);
    b.setAttribute('aria-pressed', String(on.has(id)));
    // Nothing in the fridge yet: ask what's in it first.
    if (id === 'fridge' && on.has(id) && keys('have:').length === 0) void openFridge(T.fridgeTitle, T.ok);
    refill();
    draw();
  });
  again.addEventListener('click', draw);
  take.addEventListener('click', () => {
    if (!current) return;
    const key = 'menu:' + dayKey(addDays(new Date(), day));
    const list = get<string[]>(key) ?? [];
    if (!list.includes(current.id)) set(key, [...list, current.id]);
    popLayer();
    toast(day && dayName ? T.addedDay(dayName) : T.added);
  });
  let x0: number | null = null;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (x0 !== null && touch.matches && e.changedTouches[0].clientX - x0 < -60) draw();
    x0 = null;
  });
  // A fridge change (from the sheet above) redraws under the fridge filter.
  const stop = subscribe(() => {
    if (!on.has('fridge')) return;
    refill();
    if (!current || !queue.some((r) => r.id === current!.id)) draw();
  });

  refill();
  draw();
}
