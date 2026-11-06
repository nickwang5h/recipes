// Step pictures (scripts/step-images.mjs draws them into public/steps/). A picture shows only while the
// Chinese step it was drawn for still reads the same: a reworded or reordered step loses its picture until
// it is drawn again, rather than showing one that no longer matches.
import { createHash } from 'node:crypto';
import manifest from '../data/step-images.json';
import type { Lang } from '../i18n';

type Entry = { h: string; v: string; zh: string; en: string } | null;

export interface StepPic {
  src: string;
  alt: string;
}

const plain = (s: string) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '');

/** The steps of a Chinese recipe body, read exactly as scripts/cook-links.mjs reads them. */
export function stepTexts(body: string): string[] {
  const section = body.split(/\n## /).find((p) => p.startsWith('步骤'))?.slice('步骤'.length) ?? '';
  const steps: string[] = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\d+\.\s+(.*)$/);
    if (m) steps.push(plain(m[1]));
    else if (line.trim() && steps.length) steps[steps.length - 1] += plain(line.trim());
  }
  return steps;
}

export const stepHash = (text: string) => createHash('sha1').update(text).digest('hex').slice(0, 8);

/** One picture or null per step, for the recipe whose Chinese body is given. */
export function stepPics(slug: string, zhBody: string, lang: Lang): (StepPic | null)[] {
  const entry = ((manifest as Record<string, Entry[]>)[slug] ?? []);
  return stepTexts(zhBody).map((text, i) => {
    const e = entry[i];
    if (!e || e.h !== stepHash(text)) return null;
    return { src: `/steps/${slug}/${String(i + 1).padStart(2, '0')}.webp?v=${e.v}`, alt: e[lang] || e.zh };
  });
}
