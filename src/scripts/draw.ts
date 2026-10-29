// 今晚吃什么 on phones: one recipe card at a time on a full-screen sheet. 换一个 (or a swipe left)
// draws another; 就它 puts the dish on today's menu and closes the sheet, without leaving the page.
// The pool follows the recipe list's rule: no small sides, sweets, drinks or sauces, nothing over three hours.
import type { RecipeData, SiteData } from '../pages/[...lang]/recipes-data.json';
import { pageLang, url } from '../i18n';
import { TAGS } from '../lib/categories';
import { dayKey } from '../lib/days';
import { ALWAYS_HAVE } from '../lib/fridge';
import { openFridge } from './fridge-picker';
import { openSheet, popLayer, toast, touch } from './phone';
import { get, keys, set, subscribe } from './store';
import { el, PLATE } from './ui';

const lang = pageLang();
const T = {
  zh: { title: '今晚', fridge: '冰箱里有', quick: '30 分钟内', again: '换一个', take: '就它', added: '已放进今天的菜单', empty: '没有符合条件的菜谱。', fridgeTitle: '冰箱', ok: '好' },
  en: { title: 'Tonight', fridge: 'From my fridge', quick: 'Under 30 min', again: 'Another one', take: 'This one', added: 'Added to today’s menu', empty: 'No recipes match these filters.', fridgeTitle: 'Fridge', ok: 'Done' },
}[lang];
const NOT_DINNER = ['dessert', 'drink', 'sauce'];
const FILTERS = [
  { id: 'fridge', label: T.fridge },
  { id: 'quick', label: T.quick },
  { id: 'one-pot', label: TAGS['one-pot'][lang] },
  { id: 'bento', label: TAGS.bento[lang] },
] as const;

let loading: Promise<SiteData> | undefined;
const siteData = () => (loading ??= fetch(`${url('', lang)}recipes-data.json`).then((r) => r.json()));

let opening = false;

export async function openDraw() {
  // A second tap while the data is still coming is ignored.
  if (opening) return;
  opening = true;
  let data: SiteData;
  try {
    data = await siteData();
  } catch {
    // Offline with nothing saved: fall back to the recipe list's own draw.
    loading = undefined;
    location.assign(`${url('recipes', lang)}?lucky`);
    return;
  } finally {
    opening = false;
  }
  const on = new Set<string>();
  let queue: RecipeData[] = [];
  let current: RecipeData | undefined;

  // Missing ingredients, by the fridge page's rule (staples on hand unless ticked off; substitutes count).
  const missing = (r: RecipeData) => {
    const stocked = new Set(keys('have:'));
    const has = (id: string) => stocked.has(id) || ALWAYS_HAVE.includes(id) || (data.staples.includes(id) && get('staple-off:' + id) !== true);
    return r.req.filter((id) => !has(id) && !(data.ingredients[id]?.subs ?? []).some(has));
  };
  const pool = () => {
    const stocked = new Set(keys('have:'));
    return data.recipes.filter((r: RecipeData) =>
      !r.component && !r.minor && !NOT_DINNER.includes(r.course) && r.minutes <= 180
      && (!on.has('quick') || r.minutes <= 30)
      && (!on.has('one-pot') || r.tags.includes('one-pot'))
      && (!on.has('bento') || r.tags.includes('bento'))
      && (!on.has('fridge') || (r.req.some((id: string) => stocked.has(id)) && missing(r).length <= 1)));
  };
  const refill = () => {
    queue = pool().sort(() => Math.random() - 0.5);
  };

  const sheet = openSheet({ title: T.title, full: true, className: 'sheet-draw', onClose: () => stop() });
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
    const day = 'menu:' + dayKey(new Date());
    const list = get<string[]>(day) ?? [];
    if (!list.includes(current.id)) set(day, [...list, current.id]);
    popLayer();
    toast(T.added);
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
