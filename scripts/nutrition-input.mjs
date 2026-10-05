// Prints the ingredient catalog and every recipe's ingredient list as JSON, for the nutrition generator in
// knowledge-compiler (`study.py recipes`). Item keys are "<group>-<item>", the same keys the recipe page uses.
// usage: node scripts/nutrition-input.mjs > input.json
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const root = new URL('../src/', import.meta.url).pathname;
const ingredients = yaml.load(readFileSync(join(root, 'data/ingredients.yaml'), 'utf8'));
const dir = join(root, 'content/recipes/zh');
const recipes = readdirSync(dir).filter((name) => name.endsWith('.md')).sort().map((name) => {
  const [, front, ...rest] = readFileSync(join(dir, name), 'utf8').split('---');
  const data = yaml.load(front);
  return {
    slug: name.replace(/\.md$/, ''),
    title: data.title,
    servings: data.servings,
    component: data.component ?? false,
    cuisine: data.cuisine,
    items: data.ingredients.flatMap((group, g) => group.items.map((item, i) => ({ key: `${g}-${i}`, group: group.group, ...item }))),
    body: rest.join('---').trim(),
  };
});
process.stdout.write(JSON.stringify({ ingredients, recipes }));
