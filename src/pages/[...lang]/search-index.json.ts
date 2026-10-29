import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection, type CollectionEntry } from 'astro:content';
import { langPaths, url, type Lang } from '../../i18n';
import { entries, entry } from '../../i18n/content';

export const getStaticPaths = langPaths;

// Search index for /search/. Chinese has no spaces, so the page matches substrings
// instead of words; every searchable field is plain text here.
export interface SearchDoc {
  u: string; // url
  k: 'recipe' | 'principle' | 'cuisine';
  t: string; // title
  o?: string; // original name
  c?: string; // cuisine title
  s: string; // summary
  i?: string; // ingredient names in both languages, and Chinese aliases
  p?: string; // principle titles
  b: string; // body text
  img?: string; // small cover thumbnail
}

function plain(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>|`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function thumb(cover: ImageMetadata | undefined) {
  if (!cover) return undefined;
  return (await getImage({ src: cover, width: 192, format: 'webp' })).src;
}

export const GET: APIRoute = async ({ props }) => {
  const lang = props.lang as Lang;
  const [recipes, principles, cuisines, regions, catalog] = await Promise.all([
    entries('recipes', lang),
    entries('principles', lang),
    entries('cuisines', lang),
    entries('regions', lang),
    getCollection('ingredients'),
  ]);
  const ingredient = new Map(catalog.map((i) => [i.id, i.data]));
  const principleTitle = new Map(principles.map((p) => [p.id, p.data.title]));
  const cuisineTitle = new Map(cuisines.map((c) => [c.id, c.data.title]));
  const names = (r: CollectionEntry<'recipes'>) =>
    [...new Set(r.data.ingredients.flatMap((g) => g.items.flatMap((item) => {
      const info = ingredient.get(item.ref.id);
      return [item.name, info?.zh, ...(info?.aliases ?? []), info?.en].filter(Boolean) as string[];
    })))].join(' ');

  const docs: SearchDoc[] = [];
  for (const r of recipes) {
    docs.push({
      u: url(`recipes/${r.id}`, lang), k: 'recipe', t: r.data.title, o: r.data.original,
      c: cuisineTitle.get(r.data.cuisine.id), s: r.data.summary, i: names(r),
      p: r.data.principles.map((p) => principleTitle.get(p.id)).join(' '),
      b: plain(r.body ?? ''), img: await thumb(r.data.cover),
    });
  }
  for (const p of principles) {
    docs.push({ u: url(`principles/${p.id}`, lang), k: 'principle', t: p.data.title, o: p.data.aliases.join(' '), s: p.data.summary, b: plain(p.body ?? '') });
  }
  for (const c of cuisines) {
    docs.push({ u: url(`cuisines/${c.id}`, lang), k: 'cuisine', t: c.data.title, o: c.data.original, s: c.data.summary, b: plain(c.body ?? ''), img: await thumb(c.data.cover) });
  }
  const chinese = await entry('cuisines', 'chinese', lang);
  for (const r of regions) {
    docs.push({ u: url(`cuisines/chinese/${r.id}`, lang), k: 'cuisine', t: r.data.title, o: r.data.original, c: chinese?.data.title, s: r.data.summary, b: plain(r.body ?? ''), img: await thumb(r.data.cover) });
  }
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
