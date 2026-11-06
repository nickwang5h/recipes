// Step illustrations, drawn by Codex's image tool one recipe at a time. Safe to stop and start again:
// every recipe's state is its files, so a run picks up at the first step without a current picture.
//
//   node scripts/step-images.mjs status              how many steps have a current picture
//   node scripts/step-images.mjs prompt <slug>       print the prompt Codex gets
//   node scripts/step-images.mjs draw <slug>...      draw these recipes (skips ones already done)
//   node scripts/step-images.mjs run [options]       work down the queue until told to stop
//       --limit N        stop after N recipes
//       --max-5h P       pause when Codex's five-hour window is P% used (default 85)
//       --max-week P     stop when the weekly window is P% used (default 90)
//       --wait           sleep until the five-hour window resets instead of exiting
//       --model M        Codex model (default gpt-6.1-terra)
//       --commit-every N commit public/steps and the manifest after every N recipes this run draws
//       --use-expiring-credits  redeem a Codex reset credit that would otherwise expire unused: when it has
//                        under 8 hours left and a window is used up, or when it has under 45 minutes left
//   node scripts/step-images.mjs install <slug>...   install drawn PNGs again (after a manual redraw)
//   node scripts/step-images.mjs stale               steps whose text changed since they were drawn
//   node scripts/step-images.mjs quota               Codex's windows and reset credits, as run sees them
//   node scripts/step-images.mjs sheet <slug>...     one review sheet per recipe in .step-images/sheets/
//
// Raw drawings and logs: .step-images/ (not in git). Installed pictures: public/steps/<slug>/NN.webp, one file per step (Pages caps a site at 20,000 files).
// Alt text and the hash of the step text each picture was drawn for: src/data/step-images.json.
// A recipe listed in docs/step-images/redo.txt is drawn again from scratch on the next run.
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, appendFileSync, rmdirSync, renameSync } from 'node:fs';
import { parse } from 'yaml';
import sharp from 'sharp';
import { parseRecipe } from './cook-links.mjs';

const root = new URL('../', import.meta.url).pathname;
const zhDir = `${root}src/content/recipes/zh/`;
const work = `${root}.step-images/`;
const assets = `${root}public/steps/`;
const manifestPath = `${root}src/data/step-images.json`;
const statePath = `${work}state.json`;
const logPath = `${work}run.log`;
const style = readFileSync(`${root}docs/step-images/style.md`, 'utf8');
const links = JSON.parse(readFileSync(`${root}src/data/cook-links.json`, 'utf8'));
const MAX_ATTEMPTS = 2;

const pad = (n) => String(n).padStart(2, '0');
const hash = (text) => createHash('sha1').update(text).digest('hex').slice(0, 8);
const readJson = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);
// A run whose terminal went away keeps going: the log file is the record.
process.stdout.on('error', () => {});
const log = (msg) => {
  const line = `${new Date().toISOString().slice(0, 16)} ${msg}`;
  try { console.log(line); } catch {}
  mkdirSync(work, { recursive: true });
  appendFileSync(logPath, line + '\n');
};

function load(slug) {
  const src = readFileSync(`${zhDir}${slug}.md`, 'utf8');
  return { slug, ...parseRecipe(src) };
}

/** The ingredient lines a step uses, as "嫩豆腐 500 g（切 2 cm 方块）". */
function stepIngredients(recipe, i) {
  const keys = links[recipe.slug]?.steps?.[i] ?? [];
  const catalog = ingredientNames();
  return keys.map((k) => {
    const [g, it] = k.split('-').map(Number);
    const line = recipe.data.ingredients[g]?.items[it];
    if (!line) return null;
    const name = line.name ?? catalog.get(line.ref) ?? line.ref;
    const qty = line.qty != null ? ` ${line.qty}${line.unit ? ' ' + line.unit : ''}` : '';
    return `${name}${qty}${line.note ? `（${line.note}）` : ''}`;
  }).filter(Boolean);
}

let names;
function ingredientNames() {
  names ??= new Map(parse(readFileSync(`${root}src/data/ingredients.yaml`, 'utf8')).map((c) => [c.id, c.zh ?? c.id]));
  return names;
}

function prompt(recipe, only) {
  const lines = recipe.steps.map((text, i) => {
    if (only && !only.includes(i)) return null;
    const uses = stepIngredients(recipe, i);
    return `- ${pad(i + 1)}.png — 第 ${i + 1} 步：${text}${uses.length ? `\n  这一步的材料：${uses.join('、')}` : ''}`;
  }).filter(Boolean);
  const all = recipe.steps.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const context = only ? `\n\n只画清单里的步骤；整道菜的全部步骤如下，供你对照前后：\n${all}` : '';
  return style.replace('{{RECIPE}}', `${zhDir}${recipe.slug}.md（${recipe.data.title}）`).replace('{{STEPS}}', lines.join('\n') + context);
}

const manifest = () => readJson(manifestPath, {});

/** Takes a lock directory, or returns false if a live process holds it. A lock left by a dead process is taken over. */
function tryLock(dir) {
  mkdirSync(`${work}locks`, { recursive: true });
  try {
    mkdirSync(dir);
  } catch {
    const pid = Number(existsSync(`${dir}/pid`) ? readFileSync(`${dir}/pid`, 'utf8') : 0);
    let alive = false;
    try { if (pid) { process.kill(pid, 0); alive = true; } } catch {}
    // No pid file yet means the holder is between mkdir and writing it: treat it as alive.
    if (alive || !pid) return false;
    writeFileSync(`${dir}/pid`, String(process.pid));
    return true;
  }
  writeFileSync(`${dir}/pid`, String(process.pid));
  return true;
}
const unlock = (dir) => rmSync(dir, { recursive: true, force: true });

/** Waits for a lock: for short critical sections shared by runs. */
function withLock(name, fn) {
  const dir = `${work}locks/${name}`;
  for (let tries = 0; !tryLock(dir); tries++) {
    if (tries > 600) throw new Error(`lock held too long: ${dir}`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
  }
  try { return fn(); } finally { unlock(dir); }
}

/** Read, change and write the manifest under a lock, so two runs never lose each other's entries. */
function updateManifest(change) {
  withLock('_manifest', () => {
    const m = manifest();
    change(m);
    saveManifest(m);
  });
}

/** Records how a recipe went, re-reading the file so parallel runs keep each other's entries. */
function updateState(slug, result) {
  withLock('_state', () => {
    const state = readJson(statePath, {});
    const s = state[slug] ?? {};
    s.failures = result === 'partial' ? (s.failures ?? 0) + 1 : 0;
    s.last = new Date().toISOString();
    state[slug] = s;
    writeFileSync(statePath, JSON.stringify(state, null, 1));
  });
}
function saveManifest(m) {
  const sorted = Object.fromEntries(Object.keys(m).sort().map((k) => [k, m[k]]));
  const lines = Object.entries(sorted).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`);
  // Written aside and renamed, so a run reading it at the same moment never sees half a file.
  writeFileSync(`${manifestPath}.${process.pid}`, `{\n${lines.join(',\n')}\n}\n`);
  renameSync(`${manifestPath}.${process.pid}`, manifestPath);
}

/** Indexes of steps without a picture drawn for their current text. */
function missing(recipe, m = manifest()) {
  const entry = m[recipe.slug] ?? [];
  return recipe.steps.flatMap((text, i) => {
    const e = entry[i];
    return e && e.h === hash(text) && existsSync(`${assets}${recipe.slug}/${pad(i + 1)}.webp`) ? [] : [i];
  });
}

/** Converts the PNGs Codex left in the recipe's work folder and records them. Returns the steps installed. */
async function install(recipe) {
  const dir = `${work}raw/${recipe.slug}/`;
  const alts = readJson(`${dir}steps.json`, []);
  const altFor = (file) => alts.find((a) => a.file === file) ?? {};
  const entry = [...(manifest()[recipe.slug] ?? [])];
  const done = [];
  const fresh = {};
  // Which step text each PNG was asked for: a picture drawn for an older wording is never installed.
  const askedFor = readJson(`${dir}hashes.json`, {});
  for (let i = 0; i < recipe.steps.length; i++) {
    const file = `${pad(i + 1)}.png`;
    const h = hash(recipe.steps[i]);
    if (!existsSync(dir + file) || askedFor[file] !== h) continue;
    if (entry[i]?.h === h && existsSync(`${assets}${recipe.slug}/${pad(i + 1)}.webp`)) continue;
    const meta = await sharp(dir + file).metadata();
    if (!meta.width || meta.width < 600) { log(`${recipe.slug} ${file}: too small (${meta.width}), skipped`); continue; }
    mkdirSync(`${assets}${recipe.slug}`, { recursive: true });
    const out = await sharp(dir + file).resize({ width: 960, height: 640, fit: 'cover' }).webp({ quality: 74 }).toBuffer();
    writeFileSync(`${assets}${recipe.slug}/${pad(i + 1)}.webp`, out);
    const a = altFor(file);
    // v changes whenever the picture does, so the page's URL for it does too.
    entry[i] = fresh[i] = { h, v: createHash('sha1').update(out).digest('hex').slice(0, 8), zh: a.zh ?? '', en: a.en ?? '' };
    done.push(i);
  }
  updateManifest((m) => {
    const now = [...(m[recipe.slug] ?? [])];
    for (const [i, e] of Object.entries(fresh)) now[i] = e;
    // Steps beyond the recipe's end (it lost a step) are dropped.
    now.length = recipe.steps.length;
    m[recipe.slug] = Array.from(now, (e) => e ?? null);
  });
  return done;
}

function codex(recipe, only, model) {
  const dir = `${work}raw/${recipe.slug}/`;
  mkdirSync(dir, { recursive: true });
  const text = prompt(recipe, only);
  writeFileSync(`${dir}prompt.md`, text);
  const asked = readJson(`${dir}hashes.json`, {});
  recipe.steps.forEach((s, i) => { if (!only || only.includes(i)) asked[`${pad(i + 1)}.png`] = hash(s); });
  writeFileSync(`${dir}hashes.json`, JSON.stringify(asked, null, 1));
  const cover = recipe.data.cover ? new URL(recipe.data.cover, `file://${zhDir}`).pathname : null;
  const args = ['exec', '-m', model, '--skip-git-repo-check', '-s', 'workspace-write', '-C', dir, '--ephemeral', '-o', `${dir}report.md`];
  if (cover && existsSync(cover)) args.push('-i', cover);
  args.push('--', text);
  return new Promise((resolve) => {
    const child = spawn('codex', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => chunks.push(d));
    child.on('close', (code) => {
      writeFileSync(`${dir}log.txt`, Buffer.concat(chunks));
      resolve(code);
    });
  });
}

/** Codex's rate-limit windows as { fiveHour, week, resetsAt } (percent used, unix seconds). */
function codexQuota() {
  const script = `{ printf '%s\\n' '{"id":1,"method":"initialize","params":{"clientInfo":{"name":"step-images","version":"0.1.0"}}}' '{"method":"initialized"}' '{"id":2,"method":"account/rateLimits/read"}'; sleep 12; } | codex app-server 2>/dev/null | while IFS= read -r l; do case "$l" in *'"id":2'*) printf '%s\\n' "$l"; break;; esac; done`;
  try {
    const line = execFileSync('/bin/zsh', ['-c', script], { encoding: 'utf8', timeout: 40_000 });
    const res = JSON.parse(line).result;
    const r = res.rateLimits;
    const credits = (res.rateLimitResetCredits?.credits ?? []).filter((c) => c.status === 'available').sort((a, b) => a.expiresAt - b.expiresAt);
    return { fiveHour: r.primary.usedPercent, week: r.secondary.usedPercent, resetsAt: r.primary.resetsAt, weekResetsAt: r.secondary.resetsAt, credits };
  } catch {
    return null;
  }
}

/** Redeems one Codex reset credit (both windows start over). The key makes a second run's attempt a no-op. */
function redeem(credit) {
  const req = JSON.stringify({ id: 2, method: 'account/rateLimitResetCredit/consume', params: { creditId: credit.id, idempotencyKey: `step-images-${credit.id}` } });
  const script = `{ printf '%s\\n' '{"id":1,"method":"initialize","params":{"clientInfo":{"name":"step-images","version":"0.1.0"}}}' '{"method":"initialized"}' '${req}'; sleep 15; } | codex app-server 2>/dev/null | while IFS= read -r l; do case "$l" in *'"id":2'*) printf '%s\\n' "$l"; break;; esac; done`;
  try {
    const line = execFileSync('/bin/zsh', ['-c', script], { encoding: 'utf8', timeout: 45_000 });
    const res = JSON.parse(line);
    return res.result?.outcome ?? `error ${JSON.stringify(res.error ?? res).slice(0, 200)}`;
  } catch (e) {
    return `failed ${String(e).slice(0, 200)}`;
  }
}

/** Commits the installed pictures and the manifest, and nothing else. */
function commit(note) {
  withLock('_git', () => {
    const paths = ['public/steps', 'src/data/step-images.json'];
    const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
    try {
      git('add', '--', ...paths);
      try { git('diff', '--cached', '--quiet', '--', ...paths); return; } catch {}
      const m = manifest();
      const recipes = Object.values(m).filter((e) => e.length && e.every(Boolean)).length;
      git('commit', '-m', `Step pictures: ${recipes} recipes drawn${note ? ` (${note})` : ''}\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, '--', ...paths);
      log(`committed: ${recipes} recipes`);
    } catch (e) {
      log(`commit failed: ${String(e.stderr ?? e).trim().split('\n')[0]}`);
    }
  });
}

/** One recipe: lock, draw what's missing, install. */
async function draw(slug, model) {
  const recipe = load(slug);
  const lock = `${work}locks/${slug}`;
  if (!tryLock(lock)) { log(`${slug}: locked by another run, skipped`); return 'locked'; }
  try {
    const redo = redoList();
    if (redo.has(slug)) {
      rmSync(`${work}raw/${slug}`, { recursive: true, force: true });
      rmSync(`${assets}${slug}`, { recursive: true, force: true });
      updateManifest((m) => { delete m[slug]; });
      writeFileSync(`${root}docs/step-images/redo.txt`, [...redo].filter((s) => s !== slug).join('\n') + (redo.size > 1 ? '\n' : ''));
    }
    let todo = missing(recipe);
    if (!todo.length) return 'done';
    // PNGs from an earlier run that stopped before installing count.
    await install(recipe);
    todo = missing(recipe);
    if (!todo.length) return 'done';
    const only = todo.length === recipe.steps.length ? null : todo;
    // Pictures being redrawn are removed first, so a stale one can't be installed for the new text.
    for (const i of todo) rmSync(`${work}raw/${slug}/${pad(i + 1)}.png`, { force: true });
    const started = Date.now();
    const code = await codex(recipe, only, model);
    const got = await install(recipe);
    const left = missing(recipe);
    log(`${slug}: codex exit ${code}, ${got.length} drawn, ${left.length} missing, ${Math.round((Date.now() - started) / 1000)}s`);
    return left.length ? 'partial' : 'done';
  } finally {
    unlock(lock);
  }
}

function redoList() {
  const p = `${root}docs/step-images/redo.txt`;
  return new Set(existsSync(p) ? readFileSync(p, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean) : []);
}

/** Recipes in the order they get drawn: docs/step-images/queue.txt first, then the rest by name. */
function queue() {
  const all = readdirSync(zhDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort();
  const p = `${root}docs/step-images/queue.txt`;
  const first = existsSync(p) ? readFileSync(p, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#') && all.includes(s)) : [];
  return [...new Set([...first, ...all])];
}

function option(name, fallback) {
  const i = process.argv.indexOf(name);
  return i < 0 ? fallback : process.argv[i + 1];
}

async function run() {
  const limit = Number(option('--limit', Infinity));
  const max5h = Number(option('--max-5h', 85));
  const maxWeek = Number(option('--max-week', 90));
  const model = option('--model', 'gpt-6.1-terra');
  const wait = process.argv.includes('--wait');
  const useCredits = process.argv.includes('--use-expiring-credits');
  const commitEvery = Number(option('--commit-every', 0));
  let count = 0, uncommitted = 0;
  const m = manifest();
  for (const slug of queue()) {
    if (count >= limit) break;
    if (existsSync(`${root}.step-images/STOP`)) { log('STOP file found, stopping'); break; }
    if (!missing(load(slug), m).length && !redoList().has(slug)) continue;
    if ((readJson(statePath, {})[slug]?.failures ?? 0) >= MAX_ATTEMPTS) continue;
    let stop = false;
    for (;;) {
      const q = codexQuota();
      if (!q) { log('could not read Codex quota, stopping'); stop = true; break; }
      const capped = q.week >= maxWeek || q.fiveHour >= max5h;
      // A credit about to expire is worth more spent than kept.
      const soon = useCredits ? q.credits.find((c) => c.expiresAt * 1000 - Date.now() < 24 * 3600_000) : undefined;
      const left = soon ? soon.expiresAt * 1000 - Date.now() : Infinity;
      if (soon && ((capped && left < 8 * 3600_000) || left < 45 * 60_000)) {
        log(`redeeming reset credit ${soon.id.slice(-6)} (${Math.round(left / 60000)} min before it expires; 5h ${q.fiveHour}%, week ${q.week}%): ${redeem(soon)}`);
        continue;
      }
      if (q.week >= maxWeek) { log(`weekly window ${q.week}% used, stopping (resets ${new Date(q.weekResetsAt * 1000).toISOString().slice(0, 16)})`); stop = true; break; }
      if (q.fiveHour < max5h) break;
      if (!wait) { log(`five-hour window ${q.fiveHour}% used, stopping`); stop = true; break; }
      // Wake in time to spend an expiring credit, if one is due before the window resets.
      const ms = Math.max(60_000, Math.min(q.resetsAt * 1000 - Date.now() + 60_000, left - 40 * 60_000));
      log(`five-hour window ${q.fiveHour}% used, sleeping ${Math.round(ms / 60000)} min`);
      await new Promise((r) => setTimeout(r, ms));
    }
    if (stop) break;
    const result = await draw(slug, model);
    if (result === 'locked') continue;
    updateState(slug, result);
    count++;
    if (result === 'done' && commitEvery && ++uncommitted >= commitEvery) { commit(); uncommitted = 0; }
  }
  if (commitEvery && uncommitted) commit();
  log(`run finished after ${count} recipes`);
}

function status() {
  const m = manifest();
  let steps = 0, current = 0, recipes = 0, full = 0;
  for (const slug of queue()) {
    const r = load(slug);
    const left = missing(r, m).length;
    steps += r.steps.length; current += r.steps.length - left; recipes++;
    if (!left) full++;
  }
  const state = readJson(statePath, {});
  const failed = Object.entries(state).filter(([, s]) => s.failures >= MAX_ATTEMPTS).map(([k]) => k);
  console.log(`${current}/${steps} steps drawn; ${full}/${recipes} recipes complete`);
  if (failed.length) console.log(`gave up after ${MAX_ATTEMPTS} tries: ${failed.join(' ')}`);
}

/** All of a recipe's installed pictures on one image, three across, for review. */
async function sheet(slug) {
  const dir = `${assets}${slug}/`;
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.webp')).sort() : [];
  if (!files.length) return null;
  const w = 480, h = 320, gap = 8, cols = 3, rows = Math.ceil(files.length / cols);
  const tiles = await Promise.all(files.map(async (f, i) => ({
    input: await sharp(dir + f).resize(w, h).toBuffer(),
    left: gap + (i % cols) * (w + gap), top: gap + Math.floor(i / cols) * (h + gap),
  })));
  mkdirSync(`${work}sheets`, { recursive: true });
  const out = `${work}sheets/${slug}.jpg`;
  await sharp({ create: { width: gap + cols * (w + gap), height: gap + rows * (h + gap), channels: 3, background: '#888' } })
    .composite(tiles).jpeg({ quality: 82 }).toFile(out);
  return out;
}

const [cmd, ...rest] = process.argv.slice(2);
const slugs = rest.filter((a) => !a.startsWith('--'));
if (cmd === 'status') status();
else if (cmd === 'prompt') console.log(prompt(load(slugs[0]), null));
else if (cmd === 'draw') for (const s of slugs) log(`${s}: ${await draw(s, option('--model', 'gpt-6.1-terra'))}`);
else if (cmd === 'install') for (const s of slugs) console.log(s, (await install(load(s))).length);
else if (cmd === 'run') await run();
else if (cmd === 'quota') console.log(codexQuota());
else if (cmd === 'sheet') for (const s of slugs) console.log(await sheet(s));
else if (cmd === 'stale') {
  const m = manifest();
  for (const slug of Object.keys(m)) {
    const r = load(slug);
    const stale = r.steps.flatMap((t, i) => (m[slug][i] && m[slug][i].h !== hash(t) ? [i + 1] : []));
    if (stale.length) console.log(slug, stale.join(' '));
  }
} else console.log('usage: node scripts/step-images.mjs status|prompt|draw|run|install|stale');
