// Compact recipe data for pages that work on the client: 我的, 菜单, and the menu's
// shopping list. Kept separate from the search index, which carries full text.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import { DEFAULT_STAPLES } from '../lib/fridge';
import { formatTotal, getCuisines, url } from '../lib/site';

export interface RecipeData {
  id: string;
  href: string;
  title: string;
  summary: string;
  cuisine: string;
  course: string;
  minutes: number;
  time: string;
  component: boolean;
  img?: string;
  /** Required ingredient ids (optional ones left out). */
  req: string[];
}

export interface SiteData {
  recipes: RecipeData[];
  cuisines: Record<string, { title: string; accent: string }>;
  ingredients: Record<string, { zh: string; en: string; where: 'mainstream' | 'asian' | 'specialty' }>;
  staples: string[];
}

export const GET: APIRoute = async () => {
  const cuisines = await getCuisines();
  const recipes = await getCollection('recipes');
  const catalog = await getCollection('ingredients');
  const used = new Set<string>();
  const data: SiteData = {
    recipes: await Promise.all(
      recipes.map(async (r) => {
        const req = [...new Set(r.data.ingredients.flatMap((g) => g.items.filter((i) => !i.optional).map((i) => i.ref.id)))];
        r.data.ingredients.forEach((g) => g.items.forEach((i) => used.add(i.ref.id)));
        return {
          id: r.id,
          href: url(`recipes/${r.id}`),
          title: r.data.title,
          summary: r.data.summary,
          cuisine: r.data.cuisine.id,
          course: r.data.course,
          minutes: r.data.time.prep + r.data.time.cook,
          time: formatTotal(r.data.time),
          component: r.data.component,
          img: r.data.cover ? (await getImage({ src: r.data.cover, width: 480, format: 'webp' })).src : undefined,
          req,
        };
      }),
    ),
    cuisines: Object.fromEntries(cuisines.map((c) => [c.id, { title: c.data.title, accent: c.data.accent }])),
    ingredients: Object.fromEntries(
      catalog.filter((i) => used.has(i.id)).map((i) => [i.id, { zh: i.data.zh, en: i.data.en, where: i.data.where }]),
    ),
    staples: DEFAULT_STAPLES,
  };
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
};
