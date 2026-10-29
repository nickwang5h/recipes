// Ingredient scaling and display rounding. Shared by the server-rendered
// recipe page and the RecipeKit client script so both show the same numbers.

const METRIC_UNITS = new Set(['g', 'ml']);
const COUNT_UNITS = new Set(['个', '颗', '瓣', '根', '片', '只', '块', '条', '枚', '粒', '棵', '把']);
const SPOON_UNITS = new Set(['茶匙', '汤匙', '杯']);

/** Round half-up to `digits` decimals without binary floating-point drift. */
function roundTo(value: number, digits: number): number {
  return Number(`${Math.round(Number(`${value}e${digits}`))}e-${digits}`);
}

export function scaleQty(qty: number, fromServings: number, toServings: number): number {
  return (qty * toServings) / fromServings;
}

export function roundQty(value: number, unit?: string): number {
  if (unit && METRIC_UNITS.has(unit)) {
    return value >= 10 ? Math.round(value) : Math.max(0.1, roundTo(value, 1));
  }
  if (!unit || COUNT_UNITS.has(unit)) {
    return Math.max(0.5, Math.round(value * 2) / 2);
  }
  if (SPOON_UNITS.has(unit)) {
    return Math.max(0.25, Math.round(value * 4) / 4);
  }
  return roundTo(value, 2);
}

const formatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2, useGrouping: false });

export function formatQty(value: number, unit?: string): string {
  return formatter.format(roundQty(value, unit));
}

// English unit words. Chinese units stay the data; a translation can pick another word per line
// (bay leaves counted in 片 are leaves, not slices). Counted things with no word print bare.
const EN_WORD: Record<string, string> = { g: 'g', ml: 'ml', 茶匙: 'tsp', 汤匙: 'tbsp', 杯: 'cup', 瓣: 'clove', 片: 'slice', 张: 'sheet', 段: 'piece', 块: 'piece', 把: 'handful' };
const EN_PLURAL: Record<string, string> = { cup: 'cups', clove: 'cloves', slice: 'slices', piece: 'pieces', sheet: 'sheets', leaf: 'leaves', stalk: 'stalks', sprig: 'sprigs', handful: 'handfuls', knob: 'knobs', can: 'cans' };

/** The unit as printed after the number; `word` is a translation's own choice. */
export function unitLabel(unit: string | undefined, qty: number, lang: 'zh' | 'en', word?: string): string {
  if (lang === 'zh') return unit ?? '';
  const singular = word ?? EN_WORD[unit ?? ''] ?? '';
  return roundQty(qty, unit) > 1 ? EN_PLURAL[singular] ?? singular : singular;
}

/** A translated name that changes with the count ("1 egg", "2 eggs"). */
export function countedName(name: string, plural: string | undefined, qty: number | undefined, unit?: string): string {
  return plural && qty !== undefined && roundQty(qty, unit) > 1 ? plural : name;
}
