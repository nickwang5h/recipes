export const PRINCIPLE_CATEGORIES = {
  heat: '传热',
  reactions: '化学反应',
  colloids: '乳化与胶体',
  'starch-protein': '淀粉与蛋白质',
  seasoning: '调味体系',
  prep: '处理与刀工',
} as const;

export type PrincipleCategory = keyof typeof PRINCIPLE_CATEGORIES;

export const COURSES = {
  veg: '素菜',
  meat: '荤菜',
  seafood: '水产',
  soup: '汤粥',
  staple: '主食',
  breakfast: '早餐',
  dessert: '甜品',
  sauce: '酱汁',
  drink: '饮品',
} as const;

export type Course = keyof typeof COURSES;

export const INGREDIENT_KINDS = {
  vegetable: '蔬菜',
  aromatic: '葱姜蒜香草',
  mushroom: '菌菇',
  fruit: '水果',
  meat: '猪牛羊',
  poultry: '禽类',
  seafood: '水产',
  'egg-dairy': '蛋奶',
  soy: '豆制品',
  grain: '米面',
  dried: '干货',
  seasoning: '调味料',
  alcohol: '酒',
  other: '其他',
} as const;

export type IngredientKind = keyof typeof INGREDIENT_KINDS;

export const WHERE_TO_BUY = {
  mainstream: '主流超市',
  asian: '亚洲超市',
  specialty: '专门店',
} as const;

export type WhereToBuy = keyof typeof WHERE_TO_BUY;

/** Time filters by total minutes (prep + cook). The ranges don't overlap: picking 15–30 分钟
 *  should show dishes that take about that long, not every quick egg dish as well. */
export const TIME_LIMITS = {
  '15': { label: '15 分钟内', max: 15 },
  '30': { label: '15–30 分钟', min: 16, max: 30 },
  '60': { label: '30 分钟–1 小时', min: 31, max: 60 },
  '120': { label: '1–2 小时', min: 61, max: 120 },
  long: { label: '2 小时以上', min: 121 },
} as const satisfies Record<string, { label: string; max?: number; min?: number }>;

export type TimeLimit = keyof typeof TIME_LIMITS;

export function withinTime(limit: string, minutes: number): boolean {
  const bucket = TIME_LIMITS[limit as TimeLimit] as { max?: number; min?: number } | undefined;
  if (!bucket) return true;
  return minutes <= (bucket.max ?? Infinity) && minutes >= (bucket.min ?? 0);
}
