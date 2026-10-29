// Every label comes in each language: LABELS[key][lang].
import type { Both } from '../i18n';

export const PRINCIPLE_CATEGORIES = {
  heat: { zh: '传热', en: 'Heat' },
  reactions: { zh: '化学反应', en: 'Chemical reactions' },
  colloids: { zh: '乳化与胶体', en: 'Emulsions and colloids' },
  'starch-protein': { zh: '淀粉与蛋白质', en: 'Starch and protein' },
  seasoning: { zh: '调味体系', en: 'Seasoning' },
  prep: { zh: '处理与刀工', en: 'Prep and knife work' },
} as const satisfies Record<string, Both<string>>;

export type PrincipleCategory = keyof typeof PRINCIPLE_CATEGORIES;

export const COURSES = {
  veg: { zh: '素菜', en: 'Vegetables' },
  meat: { zh: '荤菜', en: 'Meat' },
  seafood: { zh: '水产', en: 'Fish and seafood' },
  soup: { zh: '汤粥', en: 'Soups and congee' },
  staple: { zh: '主食', en: 'Rice and noodles' },
  breakfast: { zh: '早餐', en: 'Breakfast' },
  dessert: { zh: '甜品', en: 'Desserts' },
  sauce: { zh: '酱汁', en: 'Sauces' },
  drink: { zh: '饮品', en: 'Drinks' },
} as const satisfies Record<string, Both<string>>;

export type Course = keyof typeof COURSES;

/** Practical labels a cook filters by on a weekday. Criteria live in docs/round8/README.md. */
export const TAGS = {
  bento: { zh: '能带饭', en: 'Lunch box' },
  'one-pot': { zh: '一锅出', en: 'One pot' },
} as const satisfies Record<string, Both<string>>;

export type Tag = keyof typeof TAGS;

export const INGREDIENT_KINDS = {
  vegetable: { zh: '蔬菜', en: 'Vegetables' },
  aromatic: { zh: '葱姜蒜香草', en: 'Aromatics and herbs' },
  mushroom: { zh: '菌菇', en: 'Mushrooms' },
  fruit: { zh: '水果', en: 'Fruit' },
  meat: { zh: '猪牛羊', en: 'Pork, beef and lamb' },
  poultry: { zh: '禽类', en: 'Poultry' },
  seafood: { zh: '水产', en: 'Fish and seafood' },
  'egg-dairy': { zh: '蛋奶', en: 'Eggs and dairy' },
  soy: { zh: '豆制品', en: 'Tofu and soy' },
  grain: { zh: '米面', en: 'Rice, flour and noodles' },
  dried: { zh: '干货', en: 'Dried goods' },
  seasoning: { zh: '调味料', en: 'Seasonings' },
  alcohol: { zh: '酒', en: 'Wine and spirits' },
  other: { zh: '其他', en: 'Other' },
} as const satisfies Record<string, Both<string>>;

export type IngredientKind = keyof typeof INGREDIENT_KINDS;

export const WHERE_TO_BUY = {
  mainstream: { zh: '主流超市', en: 'Supermarket' },
  asian: { zh: '亚洲超市', en: 'Asian grocery' },
  specialty: { zh: '专门店', en: 'Specialty shop' },
} as const satisfies Record<string, Both<string>>;

export type WhereToBuy = keyof typeof WHERE_TO_BUY;

/** Time filters by total minutes (prep + cook). The ranges don't overlap: picking 15–30 分钟
 *  should show dishes that take about that long, not every quick egg dish as well. */
export const TIME_LIMITS = {
  '15': { label: { zh: '15 分钟内', en: 'Under 15 min' }, max: 15 },
  '30': { label: { zh: '15–30 分钟', en: '15–30 min' }, min: 16, max: 30 },
  '60': { label: { zh: '30 分钟–1 小时', en: '30 min–1 hr' }, min: 31, max: 60 },
  '120': { label: { zh: '1–2 小时', en: '1–2 hr' }, min: 61, max: 120 },
  long: { label: { zh: '2 小时以上', en: 'Over 2 hr' }, min: 121 },
} as const satisfies Record<string, { label: Both<string>; max?: number; min?: number }>;

export type TimeLimit = keyof typeof TIME_LIMITS;

export function withinTime(limit: string, minutes: number): boolean {
  const bucket = TIME_LIMITS[limit as TimeLimit] as { max?: number; min?: number } | undefined;
  if (!bucket) return true;
  return minutes <= (bucket.max ?? Infinity) && minutes >= (bucket.min ?? 0);
}
