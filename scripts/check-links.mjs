// Fail the build when a page links to an internal path that was not generated.
// Markdown bodies link by hand, so Astro's reference() checks do not cover them.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const broken = [];
for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = join(DIST, decodeURIComponent(href));
    const ok = href.endsWith('/') ? await exists(join(target, 'index.html')) : await exists(target);
    if (!ok) broken.push(`${file.slice(DIST.length)} → ${href}`);
  }
}

if (broken.length) {
  console.error(`Broken internal links:\n${broken.map((b) => `  ${b}`).join('\n')}`);
  process.exit(1);
}
console.log('Internal links OK');
