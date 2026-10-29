// Compact recipe data for pages that work on the client: 我的, 菜单, and the menu's
// shopping list. Kept separate from the search index, which carries full text.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import { formatTotal, langPaths, url, type Lang } from '../../i18n';
import { cuisines as getCuisines, entries } from '../../i18n/content';
import { DEFAULT_STAPLES } from '../../lib/fridge';

export const getStaticPaths = langPaths;

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
  /** Months in which a required ingredient is in field season. */
  season: number[];
  /** 能带饭, 一锅出: for the phone's draw. */
  tags: string[];
  /** A small side, left out of the draw. */
  minor: boolean;
}

export interface SiteData {
  recipes: RecipeData[];
  cuisines: Record<string, { title: string; accent: string }>;
  ingredients: Record<string, { zh: string; en: string; where: 'mainstream' | 'asian' | 'specialty'; subs?: string[] }>;
  staples: string[];
}

export const GET: APIRoute = async ({ props }) => {
  const lang = props.lang as Lang;
  const cuisines = await getCuisines(lang);
  const recipes = await entries('recipes', lang);
  const catalog = await getCollection('ingredients');
  const used = new Set<string>();
  const data: SiteData = {
    recipes: await Promise.all(
      recipes.map(async (r) => {
        const req = [...new Set(r.data.ingredients.flatMap((g) => g.items.filter((i) => !i.optional).map((i) => i.ref.id)))];
        r.data.ingredients.forEach((g) => g.items.forEach((i) => used.add(i.ref.id)));
        return {
          id: r.id,
          href: url(`recipes/${r.id}`, lang),
          title: r.data.title,
          summary: r.data.summary,
          cuisine: r.data.cuisine.id,
          course: r.data.course,
          minutes: r.data.time.prep + r.data.time.cook,
          time: formatTotal(r.data.time, lang),
          component: r.data.component,
          img: r.data.cover ? (await getImage({ src: r.data.cover, width: 480, format: 'webp' })).src : undefined,
          req,
          season: [...new Set(req.flatMap((id) => catalog.find((i) => i.id === id)?.data.season ?? []))],
          tags: r.data.tags,
          minor: !!r.data.minor,
        };
      }),
    ),
    cuisines: Object.fromEntries(cuisines.map((c) => [c.id, { title: c.data.title, accent: c.data.accent }])),
    ingredients: Object.fromEntries(
      catalog.filter((i) => used.has(i.id)).map((i) => [i.id, { zh: i.data.zh, en: i.data.en, where: i.data.where, ...(i.data.substitutes.length && { subs: i.data.substitutes.map((s) => s.id) }) }]),
    ),
    staples: DEFAULT_STAPLES,
  };
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
};
