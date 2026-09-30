import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { PRINCIPLE_CATEGORIES, type PrincipleCategory } from './lib/categories';

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
  schema: z.object({
    title: z.string(),
    original: z.string().optional(),
    summary: z.string(),
    accent: z.enum(['red', 'blue', 'green']),
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
    category: z.enum(Object.keys(PRINCIPLE_CATEGORIES) as [PrincipleCategory, ...PrincipleCategory[]]),
    summary: z.string(),
    related: z.array(reference('principles')).default([]),
    sources: z.array(source).min(1),
    updated: z.coerce.date(),
  }),
});

const ingredient = z.object({
  name: z.string(),
  qty: z.number().positive().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
});

const recipes = defineCollection({
  loader: glob({ base: `./src/content/recipes/${LOCALE}`, pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    original: z.string().optional(),
    cuisine: reference('cuisines'),
    summary: z.string(),
    servings: z.number().int().positive(),
    time: z.object({ prep: z.number().int().nonnegative(), cook: z.number().int().nonnegative() }),
    principles: z.array(reference('principles')).default([]),
    ingredients: z.array(z.object({ group: z.string().optional(), items: z.array(ingredient).min(1) })).min(1),
    sources: z.array(source).min(1),
    updated: z.coerce.date(),
  }),
});

export const collections = { cuisines, principles, recipes };
