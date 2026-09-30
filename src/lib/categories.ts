export const PRINCIPLE_CATEGORIES = {
  heat: '传热',
  reactions: '化学反应',
  colloids: '乳化与胶体',
  'starch-protein': '淀粉与蛋白质',
  seasoning: '调味体系',
  prep: '处理与刀工',
} as const;

export type PrincipleCategory = keyof typeof PRINCIPLE_CATEGORIES;
