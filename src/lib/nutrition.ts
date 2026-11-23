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

/** A guess at the weight of an item that cannot be counted, only to judge how much of the dish lacks data: grams as
 *  written, spoons and millilitres at 1 g/ml. A count (2 cloves, 4 sausages) without a known piece weight is null. */
function roughGrams(item: Item): number | null {
  if (item.qty === undefined) return null;
  if (item.unit === 'g') return item.qty;
  if (item.unit && item.unit in VOLUME) return item.qty * VOLUME[item.unit];
  return null;
}

/**
 * How much of what is eaten may lack data for a figure, as a share of the weight that was weighed, before the figure
 * is shown as a lower bound ("≥ …") instead of an estimate. Items without data add nothing to the sum, so the sum is
 * always a floor; the question is only how far below the truth it can be.
 *
 * 5% for most figures. If the missing items are about as rich in a nutrient as the rest of the dish, 5% of the weight
 * puts the figure about 5% low, less than the error already in matching foods and guessing how much is eaten; to be 20%
 * low they would have to be about four times as rich. In the November 2026 data the whole spices the data lacks
 * (Sichuan pepper, cassia, cloves, white pepper's sugar) stay under 5% of every dish and mostly under 1%, while the
 * main ingredients without a figure (coconut milk's sugar and fibre, noodles' sugar, shiitake's saturated fat, a 50 g
 * pickle, a 300 g sausage) mostly run from 10% to the whole dish. A 2% limit would flag 19 more dishes, nearly all for
 * a little shiitake (saturated fat), pickled chili or sesame paste (sugar), which have little of either; 10% would let
 * through 12, such as the sugar of the coconut milk in bánh xèo or of the bean sprouts in bibimbap.
 * Sodium is held to 1%: it comes mostly from salty condiments that weigh little, so a spoon of an unmeasured sauce
 * (1.7% of a dish by weight) can carry a large part of the salt. `node scripts/nutrition-gaps.mjs` lists what each
 * limit flags.
 */
export const GAP_LIMIT: Record<Key, number> = { kcal: 0.05, protein: 0.05, fat: 0.05, satfat: 0.05, carb: 0.05, sugar: 0.05, fiber: 0.05, sodium: 0.01 };

/**
 * Past this share of the weight without data for energy, even the floors say little (a dish whose main ingredient has
 * no data would show a fraction of its calories), so the panel is left out. Nothing on the site comes near it today:
 * the largest is a third (the Morteau sausage in saucisses-aux-lentilles).
 */
export const SHOW_LIMIT = 0.5;

export interface Counted {
  /** Amounts per serving, of the items with data. */
  per: Record<Key, number>;
  /** Required items not counted at all: no quantity, no data, or no weight for their unit. */
  leftOut: string[];
  /** Of those, the ones with a quantity whose weight cannot even be guessed (a count without a piece weight). */
  unknown: string[];
  /** Per nutrient, grams eaten with data and grams eaten without (a guess for items that cannot be weighed). */
  weighed: Record<Key, { known: number; missing: number }>;
  /** Per nutrient, the measured items that have no figure for it. */
  gaps: Record<Key, string[]>;
}

/** Amounts per serving and how much of the dish each amount covers; null when no item could be weighed. */
export function perServing(items: Item[], servings: number, foods: Foods, marks: Marks | undefined): Counted | null {
  const total = Object.fromEntries(KEYS.map((key) => [key, 0])) as Record<Key, number>;
  const weighed = Object.fromEntries(KEYS.map((key) => [key, { known: 0, missing: 0 }])) as Counted['weighed'];
  const gaps = Object.fromEntries(KEYS.map((key) => [key, [] as string[]])) as Counted['gaps'];
  const leftOut: string[] = [];
  const unknown: string[] = [];
  let counted = 0;
  for (const item of items) {
    if (item.optional) continue;
    const food = foods[item.ref];
    const weight = grams(item, food);
    const share = marks?.eaten[item.key] ?? 1;
    if (weight === null) {
      leftOut.push(item.key);
      if (item.qty === undefined) continue;   // "salt to taste": named in the note, nothing to weigh
      const rough = roughGrams(item);
      if (rough === null) {
        unknown.push(item.key);
        continue;
      }
      for (const key of KEYS) {
        weighed[key].missing += rough * share;
        if (rough * share > 0) gaps[key].push(item.key);
      }
      continue;
    }
    counted += 1;
    for (const key of KEYS) {
      const value = food!.per100g[key];
      if (value === null || value === undefined) {
        weighed[key].missing += weight * share;
        if (weight * share > 0) gaps[key].push(item.key);
        continue;
      }
      total[key] += (weight / 100) * value * share;
      weighed[key].known += weight * share;
    }
  }
  if (!counted) return null;
  const per = Object.fromEntries(KEYS.map((key) => [key, total[key] / servings])) as Record<Key, number>;
  return { per, leftOut, unknown, weighed, gaps };
}

/** The share of the weighed weight that has no data for this nutrient, 0–1. */
export function gapShare(result: Pick<Counted, 'weighed'>, key: Key): number {
  const { known, missing } = result.weighed[key];
  return known + missing > 0 ? missing / (known + missing) : 0;
}

/** Whether the figure is an estimate (true) or only a lower bound (false). */
export function complete(result: Pick<Counted, 'weighed'>, key: Key): boolean {
  return gapShare(result, key) <= GAP_LIMIT[key];
}

/**
 * Whether the panel is shown at all. Each figure is kept honest on its own by `complete`, so the panel is left out
 * only when the floors would say little: more than SHOW_LIMIT of the weight without data for energy, or an item whose
 * weight cannot even be guessed (a count with no piece weight), unless that item is a seasoning (a few cloves, a stick
 * of cassia, a sprig of thyme).
 */
export function worthShowing(result: Pick<Counted, 'weighed' | 'unknown'>, items: Item[], kindOf: (ref: string) => string): boolean {
  return gapShare(result, 'kcal') <= SHOW_LIMIT
    && result.unknown.every((key) => kindOf(items.find((item) => item.key === key)!.ref) === 'seasoning');
}

// Health Canada, "Safe internal cooking temperatures".
const TEMPERATURES: Record<'zh' | 'en', Record<string, string>> = {
  zh: {
    poultry: '禽肉块和禽绞肉 74℃，整只禽类 82℃',
    'ground-meat': '牛、猪、羊绞肉 71℃，含禽肉的绞肉 74℃',
    pork: '猪肉块 71℃',
    'beef-lamb': '牛羊整切肉三分熟 63℃、五分熟 71℃、全熟 77℃',
    fish: '鱼 70℃',
    shellfish: '虾蟹贝类 74℃；蛤蜊、青口、生蚝煮到壳张开，不开的丢掉',
    egg: '含蛋的菜 74℃',
  },
  en: {
    poultry: 'poultry pieces and ground poultry 74°C (165°F), whole birds 82°C (180°F)',
    'ground-meat': 'ground beef, pork and lamb 71°C (160°F), ground meat with poultry 74°C (165°F)',
    pork: 'pork cuts 71°C (160°F)',
    'beef-lamb': 'whole cuts of beef and lamb: medium-rare 63°C (145°F), medium 71°C (160°F), well done 77°C (170°F)',
    fish: 'fish 70°C (158°F)',
    shellfish: 'shrimp, crab and shellfish 74°C (165°F); cook clams, mussels and oysters until the shells open and discard any that stay shut',
    egg: 'egg dishes 74°C (165°F)',
  },
};
const RAW: Record<'zh' | 'en', Record<string, string>> = {
  zh: {
    fish: '生吃的鱼选标明可生食（sashimi-grade）的产品，冷冻处理过的可以杀死寄生虫',
    shellfish: '生吃的贝类和虾风险最高，只买标明可生食的',
    egg: '生蛋或溏心蛋可以换成巴氏杀菌蛋（pasteurized eggs）',
    'beef-lamb': '半熟只适用于整块牛羊肉，表面要煎透；绞肉一定做熟',
    poultry: '禽肉不宜生吃或半熟吃',
    pork: '猪肉不宜生吃或半熟吃',
    'ground-meat': '绞肉不宜生吃或半熟吃',
  },
  en: {
    fish: 'For fish eaten raw, buy products labelled sashimi-grade; freezing kills parasites',
    shellfish: 'Raw shellfish and shrimp carry the highest risk; buy only those labelled safe to eat raw',
    egg: 'Pasteurized eggs can stand in for raw or soft-cooked eggs',
    'beef-lamb': 'Rare and medium-rare are for whole cuts of beef and lamb only, seared well on the outside; always cook ground meat through',
    poultry: 'Poultry should not be eaten raw or undercooked',
    pork: 'Pork should not be eaten raw or undercooked',
    'ground-meat': 'Ground meat should not be eaten raw or undercooked',
  },
};

/** Internal temperatures for what is cooked, cautions for what is served raw, and a note on leftover rice. */
export function safetyNotes(items: Item[], foods: Foods, marks: Marks | undefined, lang: 'zh' | 'en' = 'zh') {
  const raw = new Set(marks?.raw ?? []);
  const cooked = new Set<string>();
  const uncooked = new Set<string>();
  for (const item of items) {
    const kind = foods[item.ref]?.safety;
    if (!kind || kind === 'none') continue;
    (raw.has(item.key) ? uncooked : cooked).add(kind);
  }
  return {
    temperatures: [...cooked].filter((kind) => TEMPERATURES[lang][kind]).map((kind) => TEMPERATURES[lang][kind]),
    raw: [...uncooked].filter((kind) => RAW[lang][kind]).map((kind) => RAW[lang][kind]),
    rice: cooked.has('rice'),
  };
}

export interface Lighter {
  target: 'sodium' | 'fat' | 'satfat';
  changes: ({ key: string; qty: number } | { key: string; remove: true })[];
  add: { ref: string; qty: number; unit: string; note: string }[];
  how: string;
}

export const LIGHTER_LABELS: Record<'zh' | 'en', Record<Lighter['target'], { label: string; nutrient: string; unit: string }>> = {
  zh: {
    sodium: { label: '少盐版', nutrient: '钠', unit: 'mg' },
    fat: { label: '少油版', nutrient: '脂肪', unit: 'g' },
    satfat: { label: '少饱和脂肪版', nutrient: '饱和脂肪', unit: 'g' },
  },
  en: {
    sodium: { label: 'Lower-sodium version', nutrient: 'sodium', unit: 'mg' },
    fat: { label: 'Lower-fat version', nutrient: 'fat', unit: 'g' },
    satfat: { label: 'Lower saturated fat version', nutrient: 'saturated fat', unit: 'g' },
  },
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
