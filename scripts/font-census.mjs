// Which characters each web font draws on each built page, at desktop and phone widths; the input to
// scripts/build-web-fonts.py. Text the browser lays out counts, shown or not (closed <details>,
// placeholders, alt text, generated content); text under display: none does not.
// Usage: npm run build; npx astro preview --port 4321 &
//        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 &
//        node scripts/font-census.mjs http://localhost:4321 census.json [9222]
import fs from 'node:fs';
import path from 'node:path';

const [base, out, port = '9222'] = process.argv.slice(2);
const dist = new URL('../dist/', import.meta.url).pathname;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name === 'index.html' ? [path.join(d, e.name)] : []));
const pages = walk(dist)
  .map((f) => '/' + path.relative(dist, path.dirname(f)).split(path.sep).join('/'))
  .map((u) => (u === '/' ? '/' : `${u}/`))
  .filter((u) => !/^\/(en\/)?404\//.test(u));

const PROBE = `(() => {
  const out = { sans: '', reading: '' };
  const fam = (el, pseudo) => /LXGW/.test(getComputedStyle(el, pseudo).fontFamily) ? 'reading' : 'sans';
  const seen = new WeakMap();
  const hasBox = (el) => { if (!el || el === document.body) return true; if (seen.has(el)) return seen.get(el); const r = getComputedStyle(el).display !== 'none' && hasBox(el.parentElement); seen.set(el, r); return r; };
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const n = w.currentNode, el = n.parentElement;
    if (!el || !n.data.trim() || el.closest('script, style, noscript') || !hasBox(el)) continue;
    out[fam(el)] += n.data;
  }
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('script, style, noscript') || !hasBox(el)) continue;
    for (const a of ['alt', 'placeholder', 'aria-label', 'title']) out[fam(el)] += el.getAttribute(a) ?? '';
    for (const pseudo of ['::before', '::after']) { const c = getComputedStyle(el, pseudo).content; if (c && c.startsWith('"')) out[fam(el, pseudo)] += c; }
  }
  return { sans: [...new Set(out.sans)].join(''), reading: [...new Set(out.reading)].join('') };
})()`;

async function tab() {
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  });
  const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['*.webp', '*.jpg', '*.png', '*.woff2', '*.svg'] });
  return { send, close: () => ws.close() };
}

// Pages drawn from the device's own data are read twice, empty and with a fridge, a menu and a list,
// so both states' words are in the page's own font file.
const DATA_PAGES = /^\/(en\/)?(|list\/|mine\/|menu\/|fridge\/)$/;
const pad = (n) => String(n).padStart(2, '0');
const day = (i) => { const d = new Date(); d.setDate(d.getDate() + i); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const doc = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { v, t: 1 }])));
const FULL = doc({
  'have:egg': true, 'have:tomato': true, 'have:firm-tofu': true, 'have:ground-pork': true, 'have:potato': true, 'have:onion': true, 'fav:hong-shao-rou': true, 'note:hong-shao-rou': '少放糖',
  [`menu:${day(0)}`]: ['hong-shao-rou', 'bai-zhuo-cai-xin', 'xi-hong-shi-ji-dan-tang'], [`menu:${day(2)}`]: ['tomato-egg'],
  'list:pork-belly': { for: ['红烧肉'], bought: false }, 'list:star-anise': { for: ['红烧肉'], bought: true }, 'list:choy-sum': { for: ['白灼菜心'], bought: false },
});
const merge = (a, b) => (a ? { sans: [...new Set(a.sans + b.sans)].join(''), reading: [...new Set(a.reading + b.reading)].join('') } : b);
const results = {};
const worker = async (list) => {
  const t = await tab();
  for (const u of list) {
    results[u] = {};
    const states = DATA_PAGES.test(u) ? ['', FULL] : [null];
    for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
      await t.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
      for (const state of states) {
        if (state !== null) {
          await t.send('Page.navigate', { url: `${base}/` });
          await new Promise((r) => setTimeout(r, 300));
          await t.send('Runtime.evaluate', { expression: `localStorage.clear(); ${state ? `localStorage.setItem('recipes:v2:doc', ${JSON.stringify(state)});` : ''} 1` });
        }
        await t.send('Page.navigate', { url: base + u });
        await new Promise((r) => setTimeout(r, state === null ? 700 : 3000));
        const r = await t.send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
        const k = mobile ? 'phone' : 'desktop';
        results[u][k] = merge(results[u][k], r.result.value);
      }
    }
  }
  t.close();
};
const N = 4;
await Promise.all(Array.from({ length: N }, (_, i) => worker(pages.filter((_, j) => j % N === i))));
fs.writeFileSync(out, JSON.stringify(results));
console.log(`${Object.keys(results).length} pages`);
