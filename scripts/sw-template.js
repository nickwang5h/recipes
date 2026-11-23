// Service worker template. scripts/build-sw.mjs fills in VERSION, PRECACHE and
// PAGE_LIST, appends the picture helpers from scripts/sw-images.mjs (imageFamily, sameImage,
// pageImages) and writes the result to dist/sw.js.
//
// Caches:
//   static-<VERSION>  hashed CSS/JS, icons, the offline page; replaced on each deploy
//   pages             HTML; network first, so a visited page is always the newest copy
//                     the reader has seen, and it survives deploys
//   images, fonts     immutable files; cache first. `images` keeps the last MAX_IMAGES seen
//   saved-images      pictures saved on purpose (the offline page's, "save everything"); never trimmed
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const PAGE_LIST = '__PAGE_LIST__';
const STATIC = `static-${VERSION}`;
const PAGES = 'pages';
const IMAGES = 'images';
const SAVED_IMAGES = 'saved-images';
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
      // Its pictures (the cat, the logo) have to be there when the network isn't.
      const html = await (await cache.match(OFFLINE)).text();
      const images = await caches.open(SAVED_IMAGES);
      for (const [src] of pageImages(html)) {
        const image = await fetch(src);
        if (image.ok) await images.put(src, image);
      }
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

  if (request.mode === 'navigate' || /^(\/en)?\/(search-index|recipes-data|fridge-data)\.json$/.test(url.pathname)) {
    // The data files change with every deploy, so they are treated like pages.
    event.respondWith(page(request));
  } else if (url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(request, FONTS));
  } else if (/\.(webp|png|jpe?g|svg)$/.test(url.pathname)) {
    event.respondWith(image(request));
  } else if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(cacheFirst(request, STATIC));
  }
});

async function page(request) {
  const cache = await caches.open(PAGES);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(pageKey(request.url), response.clone());
    return response;
  });
  network.catch(() => {}); // a late failure after a cached answer is fine
  try {
    return await withTimeout(network, NETWORK_TIMEOUT);
  } catch {
    // Slow is not offline: serve the saved copy if there is one, otherwise keep waiting for the network.
    const saved = await cache.match(pageKey(request.url));
    if (saved) return saved;
    try {
      return await network;
    } catch {
      // English pages fall back to the English offline page once it has been seen.
      const english = new URL(request.url).pathname.startsWith('/en/');
      return (
        (english && (await cache.match(new URL('/en/offline/', self.location.origin).href))) ||
        (await cache.match(OFFLINE)) ||
        new Response(english ? 'Offline' : '离线中', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      );
    }
  }
}

// Filters live in the query string (?cuisine=thai); the HTML is the same page.
function pageKey(href) {
  const url = new URL(href);
  url.search = '';
  url.hash = '';
  return url.href;
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

// Cache first, from the saved pictures or the recent ones. Offline, another width of the same picture
// will do: the browser picks a width from srcset by screen, and "save everything" keeps only one.
async function image(request) {
  const saved = await caches.open(SAVED_IMAGES);
  const recent = await caches.open(IMAGES);
  const hit = (await saved.match(request)) || (await recent.match(request));
  if (hit) return hit;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await recent.put(request, response.clone());
      trim(recent, MAX_IMAGES);
    }
    return response;
  } catch (error) {
    for (const cache of [saved, recent]) {
      const key = sameImage((await cache.keys()).map((k) => k.url), request.url);
      if (key) return cache.match(key);
    }
    throw error;
  }
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

// "Save everything for offline": fetch every page into the caches, with one copy of each picture
// it shows (covers, cards, cats; offline-images.json, made by scripts/build-sw.mjs, says which and
// where). Step pictures are left out: all of them together are well over 100 MB. Progress goes to
// the page that asked.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'save-all') return;
  const client = event.source;
  // The page names its language's list; anything else falls back to the Chinese one.
  const list = event.data.list === '/en/offline-pages.json' ? event.data.list : PAGE_LIST;
  event.waitUntil(saveAll(client, list));
});

async function saveAll(client, list) {
  const urls = await (await fetch(list, { cache: 'no-store' })).json();
  // Without the picture list (an older deploy) the pages are still saved.
  const pictures = await fetch(list.replace(/offline-pages\.json$/, 'offline-images.json'), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  const pages = await caches.open(PAGES);
  const images = await caches.open(SAVED_IMAGES);
  const recent = await caches.open(IMAGES);
  let done = 0;
  let failed = 0;
  const queue = [...urls];
  const worker = async () => {
    while (queue.length) {
      const path = queue.shift();
      try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) throw new Error(String(response.status));
        await pages.put(pageKey(new URL(path, self.location.origin).href), response);
        for (const src of pictures[path] ?? []) {
          if (!(await images.match(src))) {
            const image = (await recent.match(src)) || (await fetch(src));
            if (image.ok) await images.put(src, image);
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
