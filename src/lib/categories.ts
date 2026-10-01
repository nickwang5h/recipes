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
  asian: '华人超市',
  specialty: '专门店',
} as const;

export type WhereToBuy = keyof typeof WHERE_TO_BUY;
