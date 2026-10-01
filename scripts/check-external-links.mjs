// Checks every external source URL in the content collections.
// Prints a Markdown report; the first line is "BROKEN n" so CI can decide whether to
// open an issue. Only definite failures count as broken (404, 410, a domain that no longer
// resolves); bot protection, timeouts and TLS quirks (some sites are only reachable from
// China) are listed as unconfirmed for a human to check.
// usage: node scripts/check-external-links.mjs > report.md
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/content/', import.meta.url).pathname;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const GONE = new Set([404, 410]);

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? files(join(dir, d.name)) : d.name.endsWith('.md') ? [join(dir, d.name)] : [],
  );
}

const pages = new Map(); // url -> [page paths]
for (const file of files(root)) {
  const front = readFileSync(file, 'utf8').split('---')[1] ?? '';
  for (const [, url] of front.matchAll(/url: "?(https?:\/\/[^"\s}]+)/g)) {
    if (url.includes('github.com/Anduin2017/HowToCook') || url.includes('github.com/LukeSmithxyz/based.cooking')) continue;
    const page = file.slice(root.length);
    pages.set(url, [...(pages.get(url) ?? []), page]);
  }
}

async function check(url, attempt = 1) {
  try {
    const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
    await response.body?.cancel();
    if (response.ok) return 'ok';
    if (GONE.has(response.status)) return `broken ${response.status}`;
    return `unconfirmed ${response.status}`;
  } catch (error) {
    if (attempt < 2) return check(url, attempt + 1);
    const code = error.cause?.code ?? error.name;
    return code === 'ENOTFOUND' ? `broken ${code}` : `unconfirmed ${code}`;
  }
}

const urls = [...pages.keys()];
const results = new Map();
const queue = [...urls];
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const url = queue.shift();
      results.set(url, await check(url));
    }
  }),
);

const broken = urls.filter((u) => results.get(u).startsWith('broken'));
const blocked = urls.filter((u) => results.get(u).startsWith('unconfirmed'));
const line = (u) => `- ${results.get(u)} ${u} — ${pages.get(u).join(', ')}`;
console.log(`BROKEN ${broken.length}`);
console.log(`\n检查了 ${urls.length} 个外部链接：${urls.length - broken.length - blocked.length} 个正常，${broken.length} 个失效，${blocked.length} 个未能自动确认（多为反爬拦截、超时或只能在国内访问，需要人工在浏览器里看）。`);
if (broken.length) console.log(`\n## 失效\n\n${broken.map(line).join('\n')}`);
if (blocked.length) console.log(`\n## 未能自动确认\n\n${blocked.map(line).join('\n')}`);
