// schema.org Recipe data for search engines, built from a recipe's front matter and body.
import { countedName, formatQty, unitLabel } from './scale';

export interface RecipeLdInput {
  url: string;
  title: string;
  summary: string;
  cuisine: string;
  course: string;
  servings: number;
  time: { prep: number; cook: number };
  /** `word` and `plural` are a translation's own unit word and counted name, as on the page. */
  ingredients: { qty?: number; unit?: string; name: string; note?: string; word?: string; plural?: string }[];
  body: string;
  keywords: string[];
  image?: string;
  updated: Date;
  site: { name: string; url: string };
  lang: 'zh' | 'en';
}

const minutes = (n: number) => `PT${n}M`;

/** The numbered list under "## 步骤" ("## Steps"), with markdown links and emphasis reduced to text. */
export function steps(body: string): string[] {
  const section = body.split(/^## (?:步骤|Steps)\s*$/m)[1]?.split(/^## /m)[0] ?? '';
  return section
    .split('\n')
    .map((line) => line.match(/^\d+\.\s+(.*)$/)?.[1])
    .filter((s): s is string => !!s)
    .map((s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim());
}

export function recipeLd(r: RecipeLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.title,
    description: r.summary,
    url: r.url,
    ...(r.image ? { image: [r.image] } : {}),
    recipeCuisine: r.cuisine,
    recipeCategory: r.course,
    inLanguage: r.lang === 'zh' ? 'zh-CN' : 'en',
    recipeYield: r.lang === 'zh' ? `${r.servings} 人份` : `${r.servings} servings`,
    prepTime: minutes(r.time.prep),
    cookTime: minutes(r.time.cook),
    totalTime: minutes(r.time.prep + r.time.cook),
    keywords: r.keywords.join(', '),
    // The same words as the ingredient list on the page: on the English site 汤匙 reads "tbsp" and counted things
    // take their plural, instead of the Chinese unit the data is kept in.
    recipeIngredient: r.ingredients.map((i) => {
      const unit = i.qty != null ? unitLabel(i.unit, i.qty, r.lang, i.word) : '';
      return [i.qty != null ? `${formatQty(i.qty, i.unit)}${unit ? ` ${unit}` : ''}` : '', countedName(i.name, i.plural, i.qty, i.unit), i.note ? (r.lang === 'zh' ? `（${i.note}）` : `(${i.note})`) : '']
        .filter(Boolean)
        .join(' ')
        .replace(' （', '（');
    }),
    recipeInstructions: steps(r.body).map((text, n) => ({ '@type': 'HowToStep', position: n + 1, text })),
    dateModified: r.updated.toISOString().slice(0, 10),
    author: { '@type': 'Organization', name: r.site.name, url: r.site.url },
    publisher: { '@type': 'Organization', name: r.site.name, url: r.site.url },
  };
}
