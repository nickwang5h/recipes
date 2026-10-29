import type { CollectionEntry } from 'astro:content';
import type { Both } from '../i18n';

export const SITE_TITLE: Both<string> = { zh: 'Kiki家的饭', en: "Kiki's Kitchen" };
export const SITE_DESCRIPTION: Both<string> = {
  zh: '中餐、法餐、意大利菜和亚洲各地家常菜的原理与菜谱笔记。',
  en: 'Home cooking from China, France, Italy and across Asia, with the reason behind each step.',
};
export const MAIN_SITE = 'https://nickwang.xyz';
export const KOFI_URL = 'https://ko-fi.com/nickwang5h';

/** Recipes that cite a principle, for the reverse "用到它的菜" list. */
export function recipesUsing(principleId: string, recipes: CollectionEntry<'recipes'>[]) {
  return recipes.filter((r) => r.data.principles.some((p) => p.id === principleId));
}
