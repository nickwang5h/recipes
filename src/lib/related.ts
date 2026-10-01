// "Related recipes" for the bottom of a recipe page: dishes that share a main
// ingredient or a principle, nudged toward the same cuisine and course.
import { ALWAYS_HAVE, DEFAULT_STAPLES } from './fridge';

/** Too common to say anything about how two dishes relate. */
const IGNORED = new Set([...ALWAYS_HAVE, ...DEFAULT_STAPLES, 'garlic', 'ginger', 'scallion', 'onion', 'egg', 'unsalted-butter', 'extra-virgin-olive-oil', 'chicken-stock', 'fish-sauce']);

const SEPARATE = new Set(['dessert', 'drink', 'sauce']);

export interface RelatableRecipe {
  id: string;
  cuisine: string;
  course: string;
  principles: string[];
  ingredients: string[];
}

export function related<R extends RelatableRecipe>(target: R, all: R[], limit = 4): R[] {
  const mains = new Set(target.ingredients.filter((i) => !IGNORED.has(i)));
  const principles = new Set(target.principles);
  return all
    .filter((r) => r.id !== target.id)
    .map((r) => {
      const sharedMain = new Set(r.ingredients.filter((i) => mains.has(i))).size;
      const sharedPrinciples = r.principles.filter((p) => principles.has(p)).length;
      let score = 2 * Math.min(sharedMain, 3) + 1.5 * sharedPrinciples;
      if (r.principles[0] === target.principles[0]) score += 1;
      if (r.cuisine === target.cuisine) score += 1;
      if (r.course === target.course) score += 0.5;
      // A dessert, drink or sauce next to a main dish is rarely what a reader wants.
      else if (SEPARATE.has(r.course) || SEPARATE.has(target.course)) score -= 3;
      return { r, score, sharedMain };
    })
    .filter((x) => x.sharedMain > 0 || x.score >= 3)
    .sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id))
    .slice(0, limit)
    .map((x) => x.r);
}
