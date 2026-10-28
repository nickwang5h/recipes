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

const keys = <T extends string>(o: Record<T, string>) => Object.keys(o) as [T, ...T[]];

// Only Chinese is published for now. Each collection reads its `zh/` folder so
// entry ids stay equal to the public slug; another locale becomes a sibling folder.
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

export const collections = { cuisines, principles, recipes, ingredients, regions };
