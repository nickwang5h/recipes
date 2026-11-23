// Lists, for each nutrient, the recipes whose per-serving figure is only a lower bound because ingredients without
// data make up too much of the dish (GAP_LIMIT in src/lib/nutrition.ts), the recipes whose panel is left out, and the
// ingredients whose data would close the most gaps: a to-do list for the nutrition generator in knowledge-compiler.
// usage: node scripts/nutrition-gaps.mjs            (summary and every recipe)
//        node scripts/nutrition-gaps.mjs --json     (the same as JSON)
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { KEYS, complete, gapShare, perServing, worthShowing } from '../src/lib/nutrition.ts';

const root = new URL('../', import.meta.url).pathname;

/** Every recipe's panel as the page computes it: shown or not, and per nutrient whether it is a floor and why. */
export function nutritionGaps() {
  const data = JSON.parse(readFileSync(`${root}src/data/nutrition.json`, 'utf8'));
  const kinds = new Map(parse(readFileSync(`${root}src/data/ingredients.yaml`, 'utf8')).map((entry) => [entry.id, entry.kind]));
  const dir = `${root}src/content/recipes/zh/`;
  return readdirSync(dir).filter((file) => file.endsWith('.md')).sort().map((file) => {
    const slug = file.slice(0, -3);
    const [, front] = readFileSync(dir + file, 'utf8').match(/^---\n([\s\S]*?)\n---\n/);
    const recipe = parse(front);
    const items = recipe.ingredients.flatMap((group, g) => group.items.map((item, i) => ({
      key: `${g}-${i}`, ref: item.ref, qty: item.qty, unit: item.unit, optional: item.optional,
    })));
    const marks = data.recipes[slug];
    const counted = marks ? perServing(items, recipe.servings, data.ingredients, marks) : null;
    const refOf = (key) => items.find((item) => item.key === key).ref;
    const shown = !!counted && worthShowing(counted, items, (ref) => kinds.get(ref));
    /** @type {Partial<Record<import('../src/lib/nutrition.ts').Key, { share: number, refs: string[] }>>} */
    const floors = {};
    if (counted) {
      for (const key of KEYS) {
        if (complete(counted, key)) continue;
        floors[key] = { share: gapShare(counted, key), refs: [...new Set(counted.gaps[key].map(refOf))] };
      }
    }
    const unknown = counted ? [...new Set(counted.unknown.map(refOf))] : [];
    return { slug, hasMarks: !!marks, shown, floors, unknown };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const recipes = nutritionGaps();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(recipes, null, 1)}\n`);
  } else {
    const shown = recipes.filter((r) => r.shown);
    const hidden = recipes.filter((r) => !r.shown);
    console.log(`${recipes.length} recipes: ${shown.length} show a panel, ${shown.filter((r) => Object.keys(r.floors).length).length} of them with a lower bound`);
    console.log(`no panel (${hidden.length}): ${hidden.map((r) => `${r.slug}${r.unknown.length ? ` (cannot weigh ${r.unknown.join(', ')})` : r.hasMarks ? '' : ' (no data)'}`).join('; ')}`);
    for (const key of KEYS) {
      const list = shown.filter((r) => r.floors[key]).sort((a, b) => b.floors[key].share - a.floors[key].share);
      console.log(`\n${key}: ${list.length}`);
      for (const r of list) console.log(`  ${r.slug} ${(r.floors[key].share * 100).toFixed(1)}% ${r.floors[key].refs.join(', ')}`);
    }
    // Which missing data would turn the most floors back into estimates.
    const cost = new Map();
    for (const r of shown) for (const [key, floor] of Object.entries(r.floors)) for (const ref of floor.refs) {
      const entry = cost.get(ref) ?? { recipes: new Set(), keys: new Set() };
      entry.recipes.add(r.slug);
      entry.keys.add(key);
      cost.set(ref, entry);
    }
    console.log('\ningredients in a lower bound, by recipes affected:');
    for (const [ref, { recipes: slugs, keys }] of [...cost].sort((a, b) => b[1].recipes.size - a[1].recipes.size)) {
      console.log(`  ${ref}: ${slugs.size} (${[...keys].join(', ')})`);
    }
  }
}
