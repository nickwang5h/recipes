// Content in a language. Chinese entries are the source; an English entry is the Chinese one with
// the translation's words laid over it (title, summary, ingredient names and notes, body), so
// quantities, references and covers are never copied. Untranslated entries don't exist in English.
import { getCollection, type CollectionEntry, type ReferenceDataEntry } from 'astro:content';
import { LANGS, langParam, type Lang } from './index';

export type Kind = 'recipes' | 'principles' | 'cuisines' | 'regions';
const EN = { recipes: 'recipesEn', principles: 'principlesEn', cuisines: 'cuisinesEn', regions: 'regionsEn' } as const;

/** What a recipe line needs beyond the Chinese item: the plural for bare counts, and the unit word. */
export interface LineWords {
  plural?: string;
  /** The English unit word (singular), when the translation overrides the default. */
  word?: string;
}

const memo = new Map<string, Promise<unknown>>();
const once = <T>(key: string, make: () => Promise<T>) => {
  if (!memo.has(key)) memo.set(key, make());
  return memo.get(key) as Promise<T>;
};

/** Ids that have an English page, per collection. */
async function translated(kind: Kind): Promise<Map<string, CollectionEntry<(typeof EN)[Kind]>>> {
  return once(`translations:${kind}`, async () => new Map((await getCollection(EN[kind])).map((e) => [e.id, e])));
}

/** Points the body's links at English pages where they exist; the rest stay on the Chinese site. */
async function englishLinks(html: string): Promise<string> {
  const [recipes, principles, cuisines, regions] = await Promise.all((['recipes', 'principles', 'cuisines', 'regions'] as const).map(translated));
  const has = (path: string) => {
    const [kind, a, b] = path.split('/').filter(Boolean);
    if (!a) return true;
    if (kind === 'recipes') return recipes.has(a);
    if (kind === 'principles') return principles.has(a);
    if (kind === 'cuisines') return b ? a === 'chinese' && regions.has(b) : cuisines.has(a);
    return true;
  };
  return html.replace(/href="(\/(?:recipes|principles|cuisines|fridge|menu|search)\/[^"]*)"/g, (whole, path: string) =>
    has(path.split(/[?#]/)[0]) ? `href="/en${path}"` : whole);
}

function overlay<K extends Kind>(kind: K, zh: CollectionEntry<K>, en: CollectionEntry<(typeof EN)[K]>, html: string): CollectionEntry<K> {
  const words = en.data as Record<string, unknown>;
  const data: Record<string, unknown> = { ...zh.data, title: words.title, summary: words.summary };
  for (const field of ['original', 'coverAlt', 'aliases'] as const) {
    if (field in words) data[field] = words[field];
  }
  // A Chinese dish shows its Chinese name under the English title, as other dishes show theirs.
  if (kind === 'recipes' && !words.original && (zh as CollectionEntry<'recipes'>).data.cuisine.id === 'chinese') data.original = zh.data.title;
  if (kind === 'recipes') {
    const source = zh as CollectionEntry<'recipes'>;
    const lines = (en as CollectionEntry<'recipesEn'>).data.ingredients;
    data.ingredients = source.data.ingredients.map((group, g) => ({
      ...group,
      group: lines[g]?.group,
      items: group.items.map((item, i) => {
        const line = lines[g]?.items[i];
        if (!line) return item;
        const [name, plural] = Array.isArray(line.name) ? line.name : [line.name];
        return { ...item, name, note: line.note, plural, word: line.unit } satisfies typeof item & LineWords;
      }),
    }));
  }
  return { ...zh, data, body: en.body, filePath: en.filePath, rendered: en.rendered && { ...en.rendered, html } } as CollectionEntry<K>;
}

/** Every entry of a collection that exists in the language. */
export async function entries<K extends Kind>(kind: K, lang: Lang): Promise<CollectionEntry<K>[]> {
  return once(`entries:${lang}:${kind}`, async () => {
    const zh = (await getCollection(kind)) as CollectionEntry<K>[];
    if (lang === 'zh') return zh;
    const en = await translated(kind);
    // A recipe shows its cuisine everywhere, so it waits for that cuisine's translation.
    const cuisinesEn = await translated('cuisines');
    const ready = (e: CollectionEntry<K>) => en.has(e.id) && (kind !== 'recipes' || cuisinesEn.has((e as CollectionEntry<'recipes'>).data.cuisine.id));
    return Promise.all(zh.filter(ready).map(async (e) => {
      const twin = en.get(e.id)! as CollectionEntry<(typeof EN)[K]>;
      return overlay(kind, e, twin, await englishLinks(twin.rendered?.html ?? ''));
    }));
  });
}

/** One entry by id, or undefined when it has no page in the language. */
export async function entry<K extends Kind>(kind: K, id: string, lang: Lang): Promise<CollectionEntry<K> | undefined> {
  return (await entries(kind, lang)).find((e) => e.id === id);
}

/** Resolves front-matter references, dropping the ones without a page in the language. */
export async function resolve<K extends Kind>(refs: ReferenceDataEntry<K>[], lang: Lang): Promise<CollectionEntry<K>[]> {
  const all = await entries(refs[0]?.collection ?? ('recipes' as K), lang);
  const byId = new Map(all.map((e) => [e.id, e]));
  return refs.map((ref) => byId.get(ref.id)).filter((e): e is CollectionEntry<K> => !!e);
}

export async function cuisines(lang: Lang) {
  return (await entries('cuisines', lang)).sort((a, b) => a.data.order - b.data.order);
}

export async function cuisineMap(lang: Lang) {
  return new Map((await cuisines(lang)).map((c) => [c.id, c]));
}

/** `getStaticPaths` for a collection's pages in every language. */
export async function entryPaths<K extends Kind>(kind: K, param: string) {
  const paths = [];
  for (const lang of LANGS) {
    for (const e of await entries(kind, lang)) paths.push({ params: { lang: langParam(lang), [param]: e.id }, props: { lang, entry: e } });
  }
  return paths;
}
