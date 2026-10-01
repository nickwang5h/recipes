// Service worker template. scripts/build-sw.mjs fills in VERSION, PRECACHE and
// PAGE_LIST and writes the result to dist/sw.js.
//
// Caches:
//   static-<VERSION>  hashed CSS/JS, icons, the offline page; replaced on each deploy
//   pages             HTML; network first, so a visited page is always the newest copy
//                     the reader has seen, and it survives deploys
//   images, fonts     immutable files; cache first
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const PAGE_LIST = '__PAGE_LIST__';
const STATIC = `static-${VERSION}`;
const PAGES = 'pages';
const IMAGES = 'images';
const FONTS = 'fonts';
const OFFLINE = '/offline/';
const NETWORK_TIMEOUT = 4000;
const MAX_IMAGES = 400;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC);
      await cache.addAll(PRECACHE);
      // Keep the offline page in the page cache too, so it is served like any other page.
      const pages = await caches.open(PAGES);
      await pages.put(OFFLINE, (await cache.match(OFFLINE)).clone());
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('static-') && key !== STATIC) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(page(request));
  } else if (url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(request, FONTS));
  } else if (/\.(webp|png|jpe?g|svg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGES, MAX_IMAGES));
  } else if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(request, STATIC));
  }
});

async function page(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT);
    if (response.ok) cache.put(pageKey(request.url), response.clone());
    return response;
  } catch {
    return (
      (await cache.match(pageKey(request.url))) ||
      (await cache.match(OFFLINE)) ||
      new Response('离线中', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    );
  }
}

// Filters live in the query string (?cuisine=thai); the HTML is the same page.
function pageKey(href) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  return url.href;
}

async function cacheFirst(request, name, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    if (max) trim(cache, max);
  }
  return response;
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

// "Save everything for offline": fetch every page (and the images it shows) into the
// caches, reporting progress to the page that asked.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'save-all') return;
  const client = event.source;
  event.waitUntil(saveAll(client));
});

async function saveAll(client) {
  const urls = await (await fetch(PAGE_LIST, { cache: 'no-store' })).json();
  const pages = await caches.open(PAGES);
  const images = await caches.open(IMAGES);
  let done = 0;
  let failed = 0;
  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      const path = queue.shift();
      try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) throw new Error(String(response.status));
        const html = await response.clone().text();
        await pages.put(pageKey(new URL(path, self.location.origin).href), response);
        for (const src of html.matchAll(/<img[^>]+src="(\/_astro\/[^"]+)"/g)) {
          if (!(await images.match(src[1]))) {
            const image = await fetch(src[1]);
            if (image.ok) await images.put(src[1], image);
          }
        }
      } catch {
        failed++;
      }
      done++;
      if (done % 10 === 0 || done === urls.length) {
        client?.postMessage({ type: 'save-all-progress', done, total: urls.length, failed });
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
}
