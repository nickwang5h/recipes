// Writes dist/sw.js and dist/offline-pages.json after `astro build`.
// The version hashes every built file name, so any change to CSS, JS or images gets a
// fresh static cache; page HTML is refreshed by the network-first strategy instead.
import { createHash } from 'node:crypto';
import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

// Cloudflare Pages serves the nearest 404.html; Astro writes the English one as a page.
copyFileSync(join(dist, 'en/404/index.html'), join(dist, 'en/404.html'));

const files = walk(dist).map((path) => '/' + relative(dist, path).split(sep).join('/'));

// "Save every recipe offline" saves one language: each tree gets its own list.
const isPage = (f) => f.endsWith('/index.html') && !/^\/(en\/)?404\//.test(f);
const toPath = (f) => f.slice(0, -'index.html'.length);
const zhPages = files.filter((f) => isPage(f) && !f.startsWith('/en/')).map(toPath).concat('/search-index.json', '/recipes-data.json');
const enPages = files.filter((f) => isPage(f) && f.startsWith('/en/')).map(toPath).concat('/en/search-index.json', '/en/recipes-data.json');

const precache = [
  ...files.filter((f) => f.startsWith('/_astro/') && /\.(css|js)$/.test(f)),
  '/offline/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/',
  '/recipes/',
  '/fridge/',
  '/recipes-data.json',
];

const hash = createHash('sha256');
for (const f of files.sort()) {
  hash.update(f);
  if (f.endsWith('.html') || f.endsWith('.css') || f.endsWith('.js')) hash.update(readFileSync(join(dist, f)));
}
const version = hash.digest('hex').slice(0, 12);

const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8');
const sw = template
  .replace('__VERSION__', version)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2))
  .replace('__PAGE_LIST__', '/offline-pages.json');

writeFileSync(join(dist, 'sw.js'), sw);
writeFileSync(join(dist, 'offline-pages.json'), JSON.stringify(zhPages));
writeFileSync(join(dist, 'en/offline-pages.json'), JSON.stringify(enPages));
console.log(`sw.js ${version}: ${precache.length} precached, ${zhPages.length} + ${enPages.length} pages listed`);
