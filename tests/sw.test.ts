// The service worker's offline pictures: the helpers in scripts/sw-images.mjs, and the worker itself
// (scripts/sw-template.js, put together as scripts/build-sw.mjs does) run against a fake network and
// Cache Storage.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { imageFamily, offlineImages, pageImages, sameImage } from '../scripts/sw-images.mjs';

const cover = (name: string) =>
  `<img src="/_astro/${name}.BGc9jd_f_c1200.webp" srcset="/_astro/${name}.BGc9jd_f_c480.webp 480w, /_astro/${name}.BGc9jd_f_c800.webp 800w, /_astro/${name}.BGc9jd_f_c1200.webp 1200w" sizes="(min-width: 900px) 448px, 100vw" width="1200" height="800">`;
// A card's src (the 1200w default) is not among its srcset widths: the browser never asks for it.
const card = (name: string) =>
  `<img src="/_astro/${name}.BGc9jd_f_c1200.webp" srcset="/_astro/${name}.BGc9jd_f_k320.webp 320w, /_astro/${name}.BGc9jd_f_k480.webp 480w, /_astro/${name}.BGc9jd_f_k640.webp 640w" sizes="(min-width: 48rem) 300px, 50vw" class="card-img">`;
const logo = '<img src="/_astro/logo.C1zPLF6W_Z2lIoNJ.webp" alt width="72" height="72">';
const step = '<template data-step-pics><figure><img src="/steps/a/01.webp?v=ee1bb8c3" alt="" width="960" height="640"></figure></template>';

describe('picture helpers', () => {
  it('knows the widths of one picture apart from other pictures', () => {
    expect(imageFamily('/_astro/mapo-tofu.BGc9jd_f_1Jah37.webp')).toBe('/_astro/mapo-tofu.BGc9jd_f');
    expect(imageFamily('/_astro/mapo-tofu.BGc9jd_f_Z1ykVz4.webp')).toBe('/_astro/mapo-tofu.BGc9jd_f');
    expect(imageFamily('/_astro/ba-bao-fan.xiankUXq_ZknKER.webp')).toBe('/_astro/ba-bao-fan.xiankUXq');
    expect(imageFamily('/steps/mapo-tofu/01.webp')).toBeNull();
    expect(imageFamily('/_astro/index.B1x2y3z4.js')).toBeNull();
  });

  it('finds the same file first, then another width of it', () => {
    const keys = ['https://x/_astro/a.BGc9jd_f_c1200.webp', 'https://x/_astro/b.BGc9jd_f_k320.webp'];
    expect(sameImage(keys, 'https://x/_astro/a.BGc9jd_f_c1200.webp')).toBe(keys[0]);
    expect(sameImage(keys, 'https://x/_astro/a.BGc9jd_f_k480.webp')).toBe(keys[0]);
    expect(sameImage(keys, 'https://x/_astro/b.BGc9jd_f_c800.webp')).toBe(keys[1]);
    expect(sameImage(keys, 'https://x/_astro/c.BGc9jd_f_c800.webp')).toBeUndefined();
    expect(sameImage(keys, 'https://x/steps/a/01.webp?v=1')).toBeUndefined();
  });

  it('reads the widest srcset entry, or the src, and leaves out step pictures', () => {
    expect(pageImages(cover('a') + card('b') + logo + step)).toEqual([
      ['/_astro/a.BGc9jd_f_c1200.webp', 1200],
      ['/_astro/b.BGc9jd_f_k640.webp', 640],
      ['/_astro/logo.C1zPLF6W_Z2lIoNJ.webp', 0],
    ]);
  });

  it('saves each picture once, at the widest size any page lists, with the first page that shows it', () => {
    expect(offlineImages([['/', card('a') + card('b') + logo], ['/recipes/a/', cover('a') + logo + step]])).toEqual({
      '/': ['/_astro/a.BGc9jd_f_c1200.webp', '/_astro/b.BGc9jd_f_k640.webp', '/_astro/logo.C1zPLF6W_Z2lIoNJ.webp'],
    });
  });
});

// --- The worker in a fake browser -------------------------------------------------------------

const ORIGIN = 'https://recipes.test';
const abs = (u: string) => new URL(u, ORIGIN).href;

function fakeCaches() {
  const store = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const m = store.get(name)!;
    const key = (r: Request | string) => abs(typeof r === 'string' ? r : r.url);
    return {
      match: async (r: Request | string) => m.get(key(r))?.clone(),
      put: async (r: Request | string, res: Response) => void m.set(key(r), res.clone()),
      keys: async () => [...m.keys()].map((url) => ({ url })),
      delete: async (r: Request | string | { url: string }) => m.delete(abs(typeof r === 'string' ? r : r.url)),
      addAll: async (urls: string[]) => {
        for (const u of urls) m.set(abs(u), await site.fetch(u));
      },
    };
  };
  return {
    store,
    open,
    keys: async () => [...store.keys()],
    delete: async (name: string) => store.delete(name),
    match: async (r: Request | string) => {
      for (const name of store.keys()) {
        const hit = await (await open(name)).match(r);
        if (hit) return hit;
      }
    },
  };
}

const site = {
  online: true,
  files: new Map<string, string>(),
  requested: [] as string[],
  async fetch(input: Request | string): Promise<Response> {
    const url = new URL(typeof input === 'string' ? input : input.url, ORIGIN);
    if (!site.online) throw new TypeError('Failed to fetch');
    site.requested.push(url.pathname + url.search);
    const body = site.files.get(url.pathname);
    return body === undefined ? new Response('not found', { status: 404 }) : new Response(body);
  },
};

function worker() {
  const template = readFileSync(new URL('../scripts/sw-template.js', import.meta.url), 'utf8');
  const helpers = readFileSync(new URL('../scripts/sw-images.mjs', import.meta.url), 'utf8').replace(/^export /gm, '');
  const code = template.replace('__VERSION__', 'test').replace('__PRECACHE__', JSON.stringify(['/offline/'])).replace('__PAGE_LIST__', '/offline-pages.json') + '\n' + helpers;
  const listeners: Record<string, (event: unknown) => void> = {};
  const caches = fakeCaches();
  const self = {
    location: new URL(ORIGIN),
    addEventListener: (type: string, fn: (event: unknown) => void) => (listeners[type] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  runInNewContext(code, { self, caches, fetch: site.fetch, Response, Request, URL, setTimeout, clearTimeout, console });
  const lifecycle = async (type: string, data?: unknown) => {
    let wait: Promise<unknown> = Promise.resolve();
    listeners[type]({ data, source: { postMessage() {} }, waitUntil: (p: Promise<unknown>) => (wait = p) });
    await wait;
  };
  const get = async (path: string) => {
    let answer: Promise<Response> | undefined;
    listeners.fetch({ request: new Request(abs(path)), respondWith: (p: Promise<Response>) => (answer = p) });
    return answer!;
  };
  return { caches, lifecycle, get };
}

describe('service worker offline pictures', () => {
  // Two recipes; the list page shows their cards, each recipe page its cover.
  const pages: [string, string][] = [
    ['/recipes/', card('a') + card('b') + logo],
    ['/recipes/a/', cover('a') + logo + step],
    ['/recipes/b/', cover('b') + logo],
  ];
  const setUp = () => {
    site.online = true;
    site.files = new Map<string, string>([
      ['/offline/', '<p>offline</p>' + logo],
      ['/offline-pages.json', JSON.stringify(pages.map(([p]) => p))],
      ['/offline-images.json', JSON.stringify(offlineImages(pages))],
      ...pages,
      ['/steps/a/01.webp', 'step'],
    ]);
    for (const [, html] of pages) for (const m of html.matchAll(/\/_astro\/[^" ,]+/g)) site.files.set(m[0], `picture ${m[0]}`);
    for (let i = 0; i < 500; i++) site.files.set(`/_astro/other${i}.ABCDEFGH_x${i}.webp`, 'other');
    site.requested = [];
  };

  it('keeps what "save everything" saved through later browsing, and shows any width of it offline', async () => {
    setUp();
    const sw = worker();
    await sw.lifecycle('install');
    await sw.lifecycle('message', { type: 'save-all', list: '/offline-pages.json' });
    // Browsing online afterwards fills the recent-pictures cache well past its limit.
    for (let i = 0; i < 500; i++) await sw.get(`/_astro/other${i}.ABCDEFGH_x${i}.webp`);
    await new Promise((r) => setTimeout(r, 50)); // the trim runs in the background

    site.online = false;
    // A phone asks for the 800w cover and the 480w card; one saved copy serves both.
    for (const path of ['/_astro/a.BGc9jd_f_c800.webp', '/_astro/a.BGc9jd_f_k480.webp', '/_astro/b.BGc9jd_f_k320.webp', '/_astro/logo.C1zPLF6W_Z2lIoNJ.webp']) {
      const res = await sw.get(path);
      expect(res.ok, path).toBe(true);
    }
    expect(await (await sw.get('/_astro/a.BGc9jd_f_k480.webp')).text()).toBe('picture /_astro/a.BGc9jd_f_c1200.webp');
  });

  it('downloads one copy per picture and no step pictures', async () => {
    setUp();
    const sw = worker();
    await sw.lifecycle('message', { type: 'save-all', list: '/offline-pages.json' });
    const pictures = site.requested.filter((p) => /\.webp/.test(p));
    expect(pictures.sort()).toEqual(['/_astro/a.BGc9jd_f_c1200.webp', '/_astro/b.BGc9jd_f_c1200.webp', '/_astro/logo.C1zPLF6W_Z2lIoNJ.webp']);
  });
});
