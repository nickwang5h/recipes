import { getCollection, type CollectionEntry } from 'astro:content';

export const SITE_TITLE = '厨房原理笔记';
export const SITE_DESCRIPTION = '中餐、法餐、意大利菜和亚洲各地家常菜的原理与菜谱笔记。';
export const MAIN_SITE = 'https://nickwang.xyz';

/**
 * Build an internal link. Chinese is the unprefixed default locale; a future
 * locale only needs to pass its code here.
 */
export function url(path = '', locale = 'zh'): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const prefix = locale === 'zh' ? '' : `/${locale}`;
  return clean ? `${prefix}/${clean}/` : `${prefix}/`;
}

export async function getCuisines() {
  const cuisines = await getCollection('cuisines');
  return cuisines.sort((a, b) => a.data.order - b.data.order);
}

export async function getCuisineMap() {
  return new Map((await getCuisines()).map((c) => [c.id, c]));
}

/** Recipes that cite a principle, for the reverse "用到它的菜" list. */
export function recipesUsing(principleId: string, recipes: CollectionEntry<'recipes'>[]) {
  return recipes.filter((r) => r.data.principles.some((p) => p.id === principleId));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function formatMinutes(total: number): string {
  if (total < 60) return `${total} 分钟`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

export function formatTime({ prep, cook }: { prep: number; cook: number }): string {
  const parts = [];
  if (prep) parts.push(`准备 ${formatMinutes(prep)}`);
  if (cook) parts.push(`烹饪 ${formatMinutes(cook)}`);
  return parts.join(' · ');
}

/** Short form for cards: the whole time from start to table. */
export function formatTotal({ prep, cook }: { prep: number; cook: number }): string {
  return `共 ${formatMinutes(prep + cook)}`;
}
