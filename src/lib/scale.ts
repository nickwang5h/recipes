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
