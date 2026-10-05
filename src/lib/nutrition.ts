// Per-serving nutrition and food-safety notes for a recipe. The data (src/data/nutrition.json) is generated in
// knowledge-compiler (`study.py recipes`): each catalog ingredient matched to a Canadian Nutrient File food, the weight
// of a clove or a piece, the density for spoon measures, and per recipe what is not all eaten and what is served raw.

export const KEYS = ['kcal', 'protein', 'fat', 'satfat', 'carb', 'sugar', 'fiber', 'sodium'] as const;
export type Key = (typeof KEYS)[number];

export interface Food {
  per100g: Partial<Record<Key, number | null>>;
  grams: Record<string, number>;
  density: number | null;
  safety: string;
}
export type Foods = Record<string, Food>;
export interface Marks { eaten: Record<string, number>; raw: string[] }
export interface Item { key: string; ref: string; qty?: number; unit?: string; optional?: boolean }

const VOLUME: Record<string, number> = { ml: 1, 茶匙: 5, 汤匙: 15, 杯: 250 };

/** Canadian label daily values (Food and Drug Regulations, 2016 amendments). */
const DAILY: Partial<Record<Key, number>> = { fat: 75, satfat: 20, sugar: 100, fiber: 28, sodium: 2300 };

export function dailyValue(key: Key, amount: number): number | null {
  const daily = DAILY[key];
  return daily ? Math.round((amount / daily) * 100) : null;
}

function grams(item: Item, food: Food | undefined): number | null {
  if (item.qty === undefined || !food) return null;
  if (!KEYS.some((key) => food.per100g[key])) return 0;   // water: nothing to count, whatever the unit
  if (item.unit === 'g') return item.qty;
  if (item.unit && item.unit in VOLUME) return food.density ? item.qty * VOLUME[item.unit] * food.density : null;
  const weight = item.unit ? food.grams[item.unit] : undefined;
  return weight ? item.qty * weight : null;
}

/** Amounts per serving, the keys of required items left out, and of those the ones that had a quantity (no data or no
 *  weight for their unit); null when no item could be weighed. */
export function perServing(items: Item[], servings: number, foods: Foods, marks: Marks | undefined) {
  const total = Object.fromEntries(KEYS.map((key) => [key, 0])) as Record<Key, number>;
  const leftOut: string[] = [];
  const unknown: string[] = [];
  let counted = 0;
  for (const item of items) {
    if (item.optional) continue;
    const food = foods[item.ref];
    const weight = grams(item, food);
    if (weight === null) {
      leftOut.push(item.key);
      if (item.qty !== undefined) unknown.push(item.key);
      continue;
    }
    counted += 1;
    const share = marks?.eaten[item.key] ?? 1;
    for (const key of KEYS) total[key] += (weight / 100) * (food.per100g[key] ?? 0) * share;
  }
  if (!counted) return null;
  const per = Object.fromEntries(KEYS.map((key) => [key, total[key] / servings])) as Record<Key, number>;
  return { per, leftOut, unknown };
}

/** The numbers mean something only when every measured ingredient without data is a seasoning, small by weight. */
export function worthShowing(result: { unknown: string[] }, items: Item[], kindOf: (ref: string) => string): boolean {
  return result.unknown.every((key) => kindOf(items.find((item) => item.key === key)!.ref) === 'seasoning');
}

// Health Canada, "Safe internal cooking temperatures".
const TEMPERATURES: Record<string, string> = {
  poultry: '禽肉块和禽绞肉 74℃，整只禽类 82℃',
  'ground-meat': '牛、猪、羊绞肉 71℃，含禽肉的绞肉 74℃',
  pork: '猪肉块 71℃',
  'beef-lamb': '牛羊整切肉三分熟 63℃、五分熟 71℃、全熟 77℃',
  fish: '鱼 70℃',
  shellfish: '虾蟹贝类 74℃；蛤蜊、青口、生蚝煮到壳张开，不开的丢掉',
  egg: '含蛋的菜 74℃',
};
const RAW: Record<string, string> = {
  fish: '生吃的鱼选标明可生食（sashimi-grade）的产品，冷冻处理过的可以杀死寄生虫',
  shellfish: '生吃的贝类和虾风险最高，只买标明可生食的',
  egg: '生蛋或溏心蛋可以换成巴氏杀菌蛋（pasteurized eggs）',
  'beef-lamb': '半熟只适用于整块牛羊肉，表面要煎透；绞肉一定做熟',
  poultry: '禽肉不宜生吃或半熟吃',
  pork: '猪肉不宜生吃或半熟吃',
  'ground-meat': '绞肉不宜生吃或半熟吃',
};

/** Internal temperatures for what is cooked, cautions for what is served raw, and a note on leftover rice. */
export function safetyNotes(items: Item[], foods: Foods, marks: Marks | undefined) {
  const raw = new Set(marks?.raw ?? []);
  const cooked = new Set<string>();
  const uncooked = new Set<string>();
  for (const item of items) {
    const kind = foods[item.ref]?.safety;
    if (!kind || kind === 'none') continue;
    (raw.has(item.key) ? uncooked : cooked).add(kind);
  }
  return {
    temperatures: [...cooked].filter((kind) => TEMPERATURES[kind]).map((kind) => TEMPERATURES[kind]),
    raw: [...uncooked].filter((kind) => RAW[kind]).map((kind) => RAW[kind]),
    rice: cooked.has('rice'),
  };
}

export interface Lighter {
  target: 'sodium' | 'fat' | 'satfat';
  changes: ({ key: string; qty: number } | { key: string; remove: true })[];
  add: { ref: string; qty: number; unit: string; note: string }[];
  how: string;
}

export const LIGHTER_LABELS: Record<Lighter['target'], { label: string; nutrient: string; unit: string }> = {
  sodium: { label: '少盐版', nutrient: '钠', unit: 'mg' },
  fat: { label: '少油版', nutrient: '脂肪', unit: 'g' },
  satfat: { label: '少饱和脂肪版', nutrient: '饱和脂肪', unit: 'g' },
};

/** The recipe's items with the lighter version's cuts, removals and additions applied. */
export function lighterItems<T extends Item>(items: T[], lighter: Lighter): Item[] {
  const changes = new Map(lighter.changes.map((change) => [change.key, change]));
  const kept: Item[] = items.flatMap((item) => {
    const change = changes.get(item.key);
    if (!change) return [item];
    return 'remove' in change ? [] : [{ ...item, qty: change.qty }];
  });
  return [...kept, ...lighter.add.map((extra, n) => ({ key: `add-${n}`, ref: extra.ref, qty: extra.qty, unit: extra.unit }))];
}
