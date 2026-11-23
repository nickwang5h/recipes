// Weekly menu logic: suggesting a table of dishes for a day, and working out what the week's
// dishes still need from the shops.
import { ALWAYS_HAVE, substituteFor } from './fridge';

export interface MenuRecipe {
  id: string;
  title: string;
  cuisine: string;
  course: string;
  minutes: number;
  component: boolean;
  /** A side or trivial preparation, never suggested as a meal (content.config.ts). */
  minor?: boolean;
  req: string[];
  season?: number[];
}

/** A home-style table: one meat or fish dish, one vegetable dish, one soup. */
export const SLOTS = [
  { id: 'main', label: { zh: '荤菜', en: 'Main' }, courses: ['meat', 'seafood'] },
  { id: 'veg', label: { zh: '素菜', en: 'Vegetable' }, courses: ['veg'] },
  { id: 'soup', label: { zh: '汤', en: 'Soup' }, courses: ['soup'] },
] as const;

export type SlotId = (typeof SLOTS)[number]['id'];

/** Dishes for dinner: no small sides, sweets, drinks or sauces, nothing over three hours. Shared by
 *  今天, the draw and the menu's 配一桌. */
export const NOT_DINNER = ['dessert', 'drink', 'sauce'];
export const forDinner = (r: { component: boolean; minor?: boolean; course: string; minutes: number }) =>
  !r.component && !r.minor && !NOT_DINNER.includes(r.course) && r.minutes <= 180;

export interface SuggestOptions {
  favorites: Set<string>;
  /** Already planned this week; not suggested again. */
  planned: Set<string>;
  maxMinutes?: number;
  /** Keep the table in one cuisine when it can. */
  cuisine?: string;
  /** 1–12; dishes using something in season that month are a little more likely. */
  month?: number;
  random?: () => number;
}

function pickWeighted<T>(items: T[], weight: (item: T) => number, random: () => number): T | undefined {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let r = random() * total;
  for (const item of items) {
    r -= weight(item);
    if (r < 0) return item;
  }
  return items.at(-1);
}

/** One dish for a slot. Family favorites are three times as likely, the given cuisine twice,
 *  and dishes with something in season half as likely again. */
export function suggestDish(recipes: MenuRecipe[], slot: SlotId, options: SuggestOptions, exclude: Set<string> = new Set()): MenuRecipe | undefined {
  const { favorites, planned, maxMinutes, cuisine, month, random = Math.random } = options;
  const courses: readonly string[] = SLOTS.find((s) => s.id === slot)!.courses;
  const pool = recipes.filter(
    (r) => !r.component && !r.minor && courses.includes(r.course) && !planned.has(r.id) && !exclude.has(r.id) && (!maxMinutes || r.minutes <= maxMinutes),
  );
  return pickWeighted(
    pool,
    (r) => (favorites.has(r.id) ? 3 : 1) * (cuisine && r.cuisine === cuisine ? 2 : 1) * (month && r.season?.includes(month) ? 1.5 : 1),
    random,
  );
}

export function suggestTable(recipes: MenuRecipe[], options: SuggestOptions): Partial<Record<SlotId, MenuRecipe>> {
  const table: Partial<Record<SlotId, MenuRecipe>> = {};
  const main = suggestDish(recipes, 'main', options);
  if (main) table.main = main;
  const rest = { ...options, cuisine: options.cuisine ?? main?.cuisine };
  for (const slot of ['veg', 'soup'] as const) {
    const dish = suggestDish(recipes, slot, rest);
    if (dish) table[slot] = dish;
  }
  return table;
}

/** Ingredients the planned dishes need that aren't in the fridge or among the staples, each with
 *  the dishes that need it. A catalog substitute on hand counts as having it, as on the fridge page. */
export function weekNeeds(dishes: MenuRecipe[], have: Set<string>, staples: Set<string>, substitutes: Record<string, string[]> = {}): Map<string, string[]> {
  const needs = new Map<string, string[]>();
  const has = (id: string) => have.has(id) || staples.has(id) || ALWAYS_HAVE.includes(id);
  for (const dish of dishes) {
    for (const id of dish.req) {
      if (has(id) || substituteFor(id, has, substitutes)) continue;
      const titles = needs.get(id) ?? [];
      if (!titles.includes(dish.title)) titles.push(dish.title);
      needs.set(id, titles);
    }
  }
  return needs;
}
