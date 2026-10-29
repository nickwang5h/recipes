// The compact recipe data (recipes-data.json), fetched once per page, and the fridge rule that
// says what a dish is still missing. Shared by 今天, the draw and the list.
import type { RecipeData, SiteData } from '../pages/[...lang]/recipes-data.json';
import { pageLang, url } from '../i18n';
import { ALWAYS_HAVE } from '../lib/fridge';
import { get, keys } from './store';

let loading: Promise<SiteData> | undefined;

export function siteData(): Promise<SiteData> {
  loading ??= fetch(`${url('', pageLang())}recipes-data.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .catch((error) => {
      // A failed fetch is tried again next time instead of being remembered.
      loading = undefined;
      throw error;
    });
  return loading;
}

/** What a dish needs that isn't in the fridge: staples count unless ticked off, and a substitute covers a gap. */
export function missing(r: RecipeData, data: SiteData): string[] {
  const stocked = new Set(keys('have:'));
  const has = (id: string) => stocked.has(id) || ALWAYS_HAVE.includes(id) || (data.staples.includes(id) && get('staple-off:' + id) !== true);
  return r.req.filter((id) => !has(id) && !(data.ingredients[id]?.subs ?? []).some(has));
}

/** Dishes for dinner: no small sides, sweets, drinks or sauces, nothing over three hours. */
export const NOT_DINNER = ['dessert', 'drink', 'sauce'];
export const forDinner = (r: RecipeData) => !r.component && !r.minor && !NOT_DINNER.includes(r.course) && r.minutes <= 180;
