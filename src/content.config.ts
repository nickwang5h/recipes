import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import {
  COURSES,
  INGREDIENT_KINDS,
  PRINCIPLE_CATEGORIES,
  TAGS,
  WHERE_TO_BUY,
  type Course,
  type IngredientKind,
  type PrincipleCategory,
  type Tag,
  type WhereToBuy,
} from './lib/categories';

const keys = <T extends string>(o: Record<T, unknown>) => Object.keys(o) as [T, ...T[]];

// Chinese is the source. Each collection reads its `zh/` folder so entry ids stay equal to the
// public slug; translations sit in a sibling `en/` folder and carry only the text (see the *En
// collections at the end), so quantities, references and covers live in one place.
const LOCALE = 'zh';

const source = z.object({
  title: z.string(),
  author: z.string().optional(),
  url: z.url().optional(),
});

const cuisines = defineCollection({
  loader: glob({ base: `./src/content/cuisines/${LOCALE}`, pattern: '*.md' }),
  schema: ({ image }) => z.object({
    // Optional AI-generated cover illustration, stored under src/assets/covers/.
    cover: image().optional(),
    coverAlt: z.string().optional(),
    title: z.string(),
    original: z.string().optional(),
    summary: z.string(),
    accent: z.enum(['red', 'blue', 'green', 'yellow', 'teal', 'purple', 'orange']),
    principles: z.array(reference('principles')).default([]),
    featured: z.array(reference('recipes')).default([]),
    order: z.number(),
  }),
});

const principles = defineCollection({
  loader: glob({ base: `./src/content/principles/${LOCALE}`, pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    aliases: z.array(z.string()).default([]),
    category: z.enum(keys<PrincipleCategory>(PRINCIPLE_CATEGORIES)),
    summary: z.string(),
    related: z.array(reference('principles')).default([]),
    sources: z.array(source).min(1),
    updated: z.coerce.date(),
  }),
});

// The shared ingredient catalog. Recipes reference entries by id, which is what
// makes ingredient-based features (fridge matching, shopping lists) possible.
const ingredients = defineCollection({
  loader: file('./src/data/ingredients.yaml'),
  schema: z.object({
    zh: z.string(),
    aliases: z.array(z.string()).default([]),
    en: z.string(),
    kind: z.enum(keys<IngredientKind>(INGREDIENT_KINDS)),
    where: z.enum(keys<WhereToBuy>(WHERE_TO_BUY)),
    pantry: z.boolean().default(false),
    substitutes: z.array(reference('ingredients')).default([]),
    /** Months (1–12) the ingredient is in field season in Ontario; absent when it is year-round. */
    season: z.array(z.number().int().min(1).max(12)).optional(),
  }),
});

const ingredient = z.object({
  ref: reference('ingredients'),
  // Display name when the recipe calls the ingredient something more specific.
  name: z.string().optional(),
  qty: z.number().positive().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
  optional: z.boolean().default(false),
});

const recipes = defineCollection({
  loader: glob({ base: `./src/content/recipes/${LOCALE}`, pattern: '*.md' }),
  schema: ({ image }) => z.object({
    // Optional AI-generated cover illustration, stored under src/assets/covers/.
    cover: image().optional(),
    coverAlt: z.string().optional(),
    title: z.string(),
    original: z.string().optional(),
    cuisine: reference('cuisines'),
    course: z.enum(keys<Course>(COURSES)),
    /** A building block (sauce, stock, plain rice…) rather than a dish; hidden from browsing unless asked for. */
    component: z.boolean().default(false),
    /** A side or a trivially simple preparation (糖拌西红柿, 鸡蛋花): listed, but never suggested as tonight's meal. */
    minor: z.boolean().default(false),
    tags: z.array(z.enum(keys<Tag>(TAGS))).default([]),
    summary: z.string(),
    servings: z.number().int().positive(),
    time: z.object({ prep: z.number().int().nonnegative(), cook: z.number().int().nonnegative() }),
    principles: z.array(reference('principles')).default([]),
    ingredients: z.array(z.object({ group: z.string().optional(), items: z.array(ingredient).min(1) })).min(1),
    sources: z.array(source).min(1),
    updated: z.coerce.date(),
  }),
});

// Regional Chinese cuisines (川菜、粤菜…): technique essays shown under the chinese cuisine page.
const regions = defineCollection({
  loader: glob({ base: `./src/content/regions/${LOCALE}`, pattern: '*.md' }),
  schema: ({ image }) => z.object({
    // Optional AI-generated cover illustration, stored under src/assets/covers/.
    cover: image().optional(),
    coverAlt: z.string().optional(),
    title: z.string(),
    original: z.string().optional(),
    summary: z.string(),
    order: z.number(),
    principles: z.array(reference('principles')).default([]),
    featured: z.array(reference('recipes')).default([]),
    sources: z.array(source).min(1),
    updated: z.coerce.date(),
  }),
});

// ---------- English ----------
// A translation holds what a reader sees as words; everything else comes from the Chinese entry
// with the same id (src/i18n/content.ts merges them). `translated` is the Chinese entry's
// `updated` date the translation was made from, so a later edit to the Chinese shows up as stale.
// How to write these files: docs/english/translating.md.

/** English unit words for a recipe line; `''` prints the bare number ("2 eggs"). */
export const EN_UNITS = ['', 'g', 'ml', 'tsp', 'tbsp', 'cup', 'clove', 'slice', 'piece', 'sheet', 'leaf', 'stalk', 'sprig', 'handful', 'knob', 'can'] as const;

const enText = {
  title: z.string(),
  summary: z.string(),
  translated: z.coerce.date(),
};

const recipesEn = defineCollection({
  loader: glob({ base: './src/content/recipes/en', pattern: '*.md' }),
  schema: z.object({
    ...enText,
    original: z.string().optional(),
    coverAlt: z.string().optional(),
    // Mirrors the Chinese ingredient groups one for one, in the same order.
    ingredients: z.array(z.object({
      group: z.string().optional(),
      items: z.array(z.object({
        // A string, or [singular, plural] for things counted without a unit word ("1 egg", "2 eggs").
        name: z.union([z.string(), z.tuple([z.string(), z.string()])]),
        unit: z.enum(EN_UNITS).optional(),
        note: z.string().optional(),
      })),
    })),
  }),
});

const principlesEn = defineCollection({
  loader: glob({ base: './src/content/principles/en', pattern: '*.md' }),
  schema: z.object({ ...enText, aliases: z.array(z.string()).default([]) }),
});

const cuisinesEn = defineCollection({
  loader: glob({ base: './src/content/cuisines/en', pattern: '*.md' }),
  schema: z.object({ ...enText, original: z.string().optional(), coverAlt: z.string().optional() }),
});

const regionsEn = defineCollection({
  loader: glob({ base: './src/content/regions/en', pattern: '*.md' }),
  schema: z.object({ ...enText, original: z.string().optional(), coverAlt: z.string().optional() }),
});

export const collections = { cuisines, principles, recipes, ingredients, regions, recipesEn, principlesEn, cuisinesEn, regionsEn };
