// Which pictures "save every recipe offline" keeps, and how the service worker finds them again.
// Pure functions without imports: scripts/build-sw.mjs uses them on the built pages and also copies
// this file, minus the `export`s, into dist/sw.js; tests/sw-images.test.ts tests them.
//
// Astro writes one file per width of a picture (`mapo-tofu.BGc9jd_f_1Jah37.webp` is the 1200w copy of
// `mapo-tofu.BGc9jd_f`), and the browser picks a width from srcset by screen size and density. So the
// offline save keeps one copy per picture, the widest any page lists, and offline the service worker
// answers a request for any width of a picture with the copy it has.

/** The picture a resized file was made from (its path up to the width's own hash), or null. */
export function imageFamily(path) {
  const m = /^(\/_astro\/[^/?#]+\.[\w-]{8})_[0-9A-Za-z]+\.(?:webp|avif|png|jpe?g|gif)$/.exec(path);
  return m ? m[1] : null;
}

/** Of cached URLs (absolute or not), the one holding the same picture as `url`: the same file first,
 *  then another width of it. */
export function sameImage(keys, url) {
  const path = (u) => new URL(u, 'https://x').pathname;
  const exact = keys.find((k) => k === url || path(k) === path(url));
  if (exact) return exact;
  const family = imageFamily(path(url));
  return family ? keys.find((k) => imageFamily(path(k)) === family) : undefined;
}

/** `<img>` pictures on a page as [url, width]: the widest srcset entry, or the src of a picture
 *  without one (width 0). Only Astro's own pictures: step pictures (/steps/) are left out, since
 *  every recipe's together come to well over 100 MB. */
export function pageImages(html) {
  const out = [];
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    const srcset = / srcset="([^"]*)"/.exec(tag)?.[1];
    const candidates = srcset
      ? srcset.split(',').map((c) => c.trim().split(/\s+/)).map(([u, w]) => [u, Number.parseFloat(w) || 0])
      : [[/ src="([^"]*)"/.exec(tag)?.[1], 0]];
    const best = candidates.filter(([u]) => u?.startsWith('/_astro/')).sort((a, b) => b[1] - a[1])[0];
    if (best) out.push(best);
  }
  return out;
}

/** For each page (in the order given), the pictures to save along with it: every picture once, the
 *  widest copy any page lists, saved with the first page that shows it. */
export function offlineImages(pages) {
  const widest = new Map(); // picture → [url, width, first page]
  for (const [page, html] of pages) {
    for (const [url, width] of pageImages(html)) {
      const key = imageFamily(url) ?? url;
      const seen = widest.get(key);
      if (!seen) widest.set(key, [url, width, page]);
      else if (width > seen[1]) widest.set(key, [url, width, seen[2]]);
    }
  }
  const out = {};
  for (const [url, , page] of widest.values()) (out[page] ??= []).push(url);
  return out;
}
