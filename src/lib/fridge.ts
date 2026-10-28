// Matching recipes against the ingredients a cook has on hand. Pure functions,
// shared by the fridge page script and the tests.

/** Always treated as available and never shown as missing. */
export const ALWAYS_HAVE = ['water'];

/** Ticked by default in the fridge page's staples section; the cook can untick any.
 *  葱姜蒜 are here because nearly every Chinese recipe needs them and nobody thinks to pick them. */
export const DEFAULT_STAPLES = [
  'scallion',
  'ginger',
  'garlic',
  'vegetable-oil',
  'salt',
  'sugar',
  'light-soy-sauce',
  'dark-soy-sauce',
  'shaoxing-wine',
  'potato-starch',
  'white-pepper',
  'black-pepper',
  'sesame-oil',
  'oyster-sauce',
  'chinkiang-vinegar',
  'flour',
];

export interface MatchableRecipe {
  id: string;
  /** Ids of the non-optional ingredients, without duplicates. */
  req: string[];
}

export interface Match<R extends MatchableRecipe> {
  recipe: R;
  missing: string[];
  /** [needed, used instead] pairs where a catalog substitute covers a gap. */
  swaps: [string, string][];
  /** How many of the cook's chosen (non-staple) ingredients the recipe uses. */
  used: number;
}

export interface MatchOptions {
  /** Ingredients the cook picked, staples excluded. */
  chosen: Set<string>;
  /** Staples currently ticked. */
  staples: Set<string>;
  /** Catalog substitutes: id → ids that can stand in for it. */
  substitutes: Record<string, string[]>;
  /** Recipes missing more than this many ingredients are dropped. */
  maxMissing: number;
}

export function matchRecipes<R extends MatchableRecipe>(recipes: R[], opts: MatchOptions): Match<R>[] {
  const { chosen, staples, substitutes, maxMissing } = opts;
  const has = (id: string) => chosen.has(id) || staples.has(id) || ALWAYS_HAVE.includes(id);

  const matches: Match<R>[] = [];
  for (const recipe of recipes) {
    const missing: string[] = [];
    const swaps: [string, string][] = [];
    let used = 0;
    for (const id of recipe.req) {
      if (chosen.has(id)) used++;
      if (has(id)) continue;
      const sub = substitutes[id]?.find(has);
      if (sub) {
        swaps.push([id, sub]);
        if (chosen.has(sub)) used++;
      } else {
        missing.push(id);
      }
    }
    // A recipe that only needs staples says nothing about what is in the fridge.
    if (used === 0 || missing.length > maxMissing) continue;
    matches.push({ recipe, missing, swaps, used });
  }
  return matches.sort((a, b) => a.missing.length - b.missing.length || b.used - a.used);
}

/** Case-insensitive search over an ingredient's names; exact and prefix hits rank first. */
export function searchIngredients<T extends { id: string; names: string[] }>(items: T[], query: string, limit = 8): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (item: T) => {
    let best = Infinity;
    for (const name of item.names) {
      const n = name.toLowerCase();
      if (n === q) best = Math.min(best, 0);
      else if (n.startsWith(q)) best = Math.min(best, 1);
      else if (n.includes(q)) best = Math.min(best, 2);
    }
    return best;
  };
  return items
    .map((item) => ({ item, s: score(item) }))
    .filter(({ s }) => s < Infinity)
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map(({ item }) => item);
}
