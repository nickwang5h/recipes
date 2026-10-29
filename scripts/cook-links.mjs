// Writes src/data/cook-links.json: for each recipe, which ingredient lines each step uses and which
// step each key point belongs to, for the phone's cooking mode. Matching is on the Chinese text,
// which every translation follows step for step. Entries marked `"checked": true` were read by a
// person and are kept as they are; everything else is regenerated.
// Usage: node scripts/cook-links.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse } from 'yaml';

const root = new URL('../', import.meta.url).pathname;
const out = `${root}src/data/cook-links.json`;
const catalog = new Map(parse(readFileSync(`${root}src/data/ingredients.yaml`, 'utf8')).map((c) => [c.id, c]));
const previous = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};

// One-character names are too loose (油 is in 酱油, 出油, 油温) except these, which are rarely anything else.
const SINGLE = new Set(['姜', '葱', '蒜', '盐']);
// Water has no amount worth showing at a step.
const SKIP = new Set(['water']);

const plain = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '');

export function parseRecipe(src) {
  const [, front, body] = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const data = parse(front);
  const section = (name) => body.split(/\n## /).find((p) => p.startsWith(name))?.slice(name.length) ?? '';
  const steps = [];
  for (const line of section('步骤').split('\n')) {
    const m = line.match(/^\d+\.\s+(.*)$/);
    if (m) steps.push(plain(m[1]));
    else if (line.trim() && steps.length) steps[steps.length - 1] += plain(line.trim());
  }
  const tips = [];
  for (const line of section('要点').split('\n')) {
    const m = line.match(/^-\s+(.*)$/);
    if (m) tips.push(plain(m[1]));
  }
  return { data, steps, tips };
}

/** Ingredient line keys ("group-item") each step mentions, in the order they come up. Only a line's
 *  first mention counts: later ones are mostly about something already in the pan (checked against
 *  30 recipes read by hand: 99% of the chips this gives are right, about half of the right ones found). */
export function stepLinks({ data, steps }) {
  const items = data.ingredients.flatMap((g, gi) => g.items.map((it, ii) => ({ key: `${gi}-${ii}`, ref: it.ref, name: it.name })));
  const owners = new Map();
  const add = (word, key) => {
    if (!word || (word.length < 2 && !SINGLE.has(word))) return;
    owners.set(word, new Set([...(owners.get(word) ?? []), key]));
  };
  const refCount = new Map();
  for (const it of items) refCount.set(it.ref, (refCount.get(it.ref) ?? 0) + 1);
  for (const it of items) {
    if (SKIP.has(it.ref)) continue;
    const c = catalog.get(it.ref) ?? {};
    // The same ingredient twice (sugar for the caramel and sugar to taste) can't be told apart by name.
    const key = refCount.get(it.ref) > 1 ? null : it.key;
    for (const w of [it.name, c.zh, ...(c.aliases ?? [])]) add(w, key);
    // 带皮五花肉 is also called 五花肉 in the steps.
    if (it.name && it.name.length >= 4) add(it.name.slice(-3), key);
    if (it.name && it.name.length === 3) add(it.name.slice(-2), key);
  }
  const words = [...owners.keys()].sort((a, b) => b.length - a.length);
  const seen = new Set();
  return steps.map((text) => {
    const hits = [];
    for (let i = 0; i < text.length; ) {
      const w = words.find((word) => text.startsWith(word, i));
      if (!w) { i++; continue; }
      const keys = owners.get(w);
      // A word two lines share, or a line that appears twice, is left out rather than guessed.
      if (keys.size === 1 && !keys.has(null)) {
        const [k] = keys;
        if (!seen.has(k)) { seen.add(k); hits.push(k); }
      }
      i += w.length;
    }
    return hits;
  });
}

/** For each key point, the step it shares clearly the most two-character chunks with, or -1. The bar is
 *  high on purpose: a key point under the wrong step misleads, one left for the last step does not. */
export function tipLinks({ steps, tips }) {
  const grams = (s) => {
    const t = s.replace(/[，。、；：（）“”\s\d–-]/g, '');
    const set = new Set();
    for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
    return set;
  };
  const stepGrams = steps.map(grams);
  return tips.map((tip) => {
    const tg = grams(tip);
    const scores = stepGrams.map((sg) => [...tg].filter((g) => sg.has(g)).length);
    const [first, second = 0] = [...scores].sort((a, b) => b - a);
    return first >= 5 && first - second >= 3 ? scores.indexOf(first) : -1;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = `${root}src/content/recipes/zh/`;
  const links = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const id = file.slice(0, -3);
    if (previous[id]?.checked) { links[id] = previous[id]; continue; }
    const recipe = parseRecipe(readFileSync(dir + file, 'utf8'));
    links[id] = { steps: stepLinks(recipe), tips: tipLinks(recipe) };
  }
  writeFileSync(out, JSON.stringify(links, null, 0).replace(/\},"/g, '},\n"') + '\n');
  const n = Object.values(links);
  const steps = n.flatMap((l) => l.steps);
  console.log(`${n.length} recipes, ${n.filter((l) => l.checked).length} checked; ${steps.filter((s) => s.length).length}/${steps.length} steps with ingredients; ${n.flatMap((l) => l.tips).filter((t) => t >= 0).length}/${n.flatMap((l) => l.tips).length} key points placed`);
}
