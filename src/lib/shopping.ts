// Shopping list for the fridge page: ingredients a cook is missing, remembered with
// the dishes that need them and grouped by where they are sold in Canada.
import { WHERE_TO_BUY, type WhereToBuy } from './categories';

export interface ListItem {
  id: string;
  /** Recipe titles that need this ingredient. */
  for: string[];
  bought: boolean;
}

export interface CatalogInfo {
  zh: string;
  en: string;
  where: WhereToBuy;
}

/** Adds a recipe's missing ingredients; an item already on the list just gains the recipe. */
export function addMissing(list: ListItem[], recipe: string, missing: string[]): ListItem[] {
  const next = list.map((item) => ({ ...item, for: [...item.for] }));
  for (const id of missing) {
    const existing = next.find((item) => item.id === id);
    if (existing) {
      if (!existing.for.includes(recipe)) existing.for.push(recipe);
    } else {
      next.push({ id, for: [recipe], bought: false });
    }
  }
  return next;
}

export function grouped(list: ListItem[], catalog: Map<string, CatalogInfo>, lang: 'zh' | 'en' = 'zh') {
  return (Object.keys(WHERE_TO_BUY) as WhereToBuy[])
    .map((where) => ({
      where,
      label: WHERE_TO_BUY[where][lang],
      items: list
        .filter((item) => (catalog.get(item.id)?.where ?? 'mainstream') === where)
        .sort((a, b) => (catalog.get(a.id)?.[lang] ?? a.id).localeCompare(catalog.get(b.id)?.[lang] ?? b.id, lang)),
    }))
    .filter((g) => g.items.length > 0);
}

/** Plain text for pasting into a notes app or message. */
export function toText(list: ListItem[], catalog: Map<string, CatalogInfo>, lang: 'zh' | 'en' = 'zh'): string {
  const lines = [lang === 'en' ? 'Shopping list' : '购物清单'];
  for (const group of grouped(list.filter((i) => !i.bought), catalog, lang)) {
    lines.push('', lang === 'en' ? `[${group.label}]` : `【${group.label}】`);
    for (const item of group.items) {
      const info = catalog.get(item.id);
      // Each language adds the other's name where it helps at the shop.
      if (lang === 'en') lines.push(`- ${info?.en ?? item.id}${info?.where === 'asian' ? ` (${info.zh})` : ''} — ${item.for.join(', ')}`);
      else lines.push(`- ${info?.zh ?? item.id}（${info?.en ?? ''}）— ${item.for.join('、')}`);
    }
  }
  return lines.join('\n');
}
