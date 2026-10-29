// What the phone's fridge picker needs, on the fridge page and in the sheet opened from other pages:
// the ingredients recipes use, grouped by kind with the most used first, and the staples.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { langPaths, type Lang } from '../../i18n';
import { entries } from '../../i18n/content';
import { INGREDIENT_KINDS, type IngredientKind } from '../../lib/categories';
import { ALWAYS_HAVE, DEFAULT_STAPLES } from '../../lib/fridge';

export const getStaticPaths = langPaths;

export interface FridgeData {
  kinds: { label: string; ids: string[] }[];
  staples: string[];
  /** id → [label, the names a search matches]. */
  ingredients: Record<string, [string, string[]]>;
  words: { empty: string; placeholder: string; staples: string; more: string; search: string };
}

const WORDS = {
  zh: { empty: '还没选。搜索或在下面的类别里点选。', placeholder: '搜索：鸡蛋、番茄、pork…', staples: '葱姜蒜和常备调料', more: '更多', search: '搜索食材' },
  en: { empty: 'Nothing yet. Search, or tap ingredients in the groups below.', placeholder: 'Search: eggs, tofu…', staples: 'Aromatics and pantry staples', more: 'More', search: 'Search ingredients' },
};

export const GET: APIRoute = async ({ props }) => {
  const lang = props.lang as Lang;
  const recipes = await entries('recipes', lang);
  const catalog = await getCollection('ingredients');
  // Same counting as the fridge page: how many recipes use each ingredient.
  const uses = new Map<string, number>();
  for (const r of recipes) for (const id of new Set(r.data.ingredients.flatMap((g) => g.items.map((i) => i.ref.id)))) uses.set(id, (uses.get(id) ?? 0) + 1);
  const used = catalog.filter((i) => uses.has(i.id) || catalog.some((o) => uses.has(o.id) && o.data.substitutes.some((s) => s.id === i.id)));
  const byUse = (a: (typeof catalog)[number], b: (typeof catalog)[number]) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0);
  const skip = new Set([...ALWAYS_HAVE, ...DEFAULT_STAPLES]);
  const label = (i: (typeof catalog)[number]) => (lang === 'en' ? i.data.en : i.data.zh);
  const data: FridgeData = {
    kinds: (Object.keys(INGREDIENT_KINDS) as IngredientKind[])
      .map((kind) => ({ label: INGREDIENT_KINDS[kind][lang], ids: used.filter((i) => i.data.kind === kind && !skip.has(i.id)).sort(byUse).map((i) => i.id) }))
      .filter((k) => k.ids.length > 0),
    staples: DEFAULT_STAPLES,
    ingredients: Object.fromEntries(used.filter((i) => !ALWAYS_HAVE.includes(i.id)).map((i) => [i.id, [label(i), [i.data.zh, ...i.data.aliases, i.data.en]]])),
    words: WORDS[lang],
  };
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
};
