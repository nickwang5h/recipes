import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { url } from '../lib/site';

// Search index for /search/. Chinese has no spaces, so the page matches substrings
// instead of words; every searchable field is plain text here.
export interface SearchDoc {
  u: string; // url
  k: '菜谱' | '原理' | '菜系';
  t: string; // title
  o?: string; // original name
  c?: string; // cuisine title
  s: string; // summary
  i?: string; // ingredient names, aliases and English names
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

export const GET: APIRoute = async () => {
  const [recipes, principles, cuisines, regions, catalog] = await Promise.all([
    getCollection('recipes'),
    getCollection('principles'),
    getCollection('cuisines'),
    getCollection('regions'),
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
      u: url(`recipes/${r.id}`), k: '菜谱', t: r.data.title, o: r.data.original,
      c: cuisineTitle.get(r.data.cuisine.id), s: r.data.summary, i: names(r),
      p: r.data.principles.map((p) => principleTitle.get(p.id)).join(' '),
      b: plain(r.body ?? ''), img: await thumb(r.data.cover),
    });
  }
  for (const p of principles) {
    docs.push({ u: url(`principles/${p.id}`), k: '原理', t: p.data.title, o: p.data.aliases.join(' '), s: p.data.summary, b: plain(p.body ?? '') });
  }
  for (const c of cuisines) {
    docs.push({ u: url(`cuisines/${c.id}`), k: '菜系', t: c.data.title, o: c.data.original, s: c.data.summary, b: plain(c.body ?? ''), img: await thumb(c.data.cover) });
  }
  const chinese = await getEntry('cuisines', 'chinese');
  for (const r of regions) {
    docs.push({ u: url(`cuisines/chinese/${r.id}`), k: '菜系', t: r.data.title, o: r.data.original, c: chinese?.data.title, s: r.data.summary, b: plain(r.body ?? ''), img: await thumb(r.data.cover) });
  }
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
