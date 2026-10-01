// Weekly menu logic: suggesting a table of dishes for a day, and working out what the week's
// dishes still need from the shops.

export interface MenuRecipe {
  id: string;
  title: string;
  cuisine: string;
  course: string;
  minutes: number;
  component: boolean;
  req: string[];
  season?: number[];
}

/** A home-style table: one meat or fish dish, one vegetable dish, one soup. */
export const SLOTS = [
  { id: 'main', label: '荤菜', courses: ['meat', 'seafood'] },
  { id: 'veg', label: '素菜', courses: ['veg'] },
  { id: 'soup', label: '汤', courses: ['soup'] },
] as const;

export type SlotId = (typeof SLOTS)[number]['id'];

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
    (r) => !r.component && courses.includes(r.course) && !planned.has(r.id) && !exclude.has(r.id) && (!maxMinutes || r.minutes <= maxMinutes),
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

/** Ingredients the planned dishes need that aren't in the fridge or among the staples,
 *  each with the dishes that need it. */
export function weekNeeds(dishes: MenuRecipe[], have: Set<string>, staples: Set<string>): Map<string, string[]> {
  const needs = new Map<string, string[]>();
  for (const dish of dishes) {
    for (const id of dish.req) {
      if (id === 'water' || have.has(id) || staples.has(id)) continue;
      const titles = needs.get(id) ?? [];
      if (!titles.includes(dish.title)) titles.push(dish.title);
      needs.set(id, titles);
    }
  }
  return needs;
}
