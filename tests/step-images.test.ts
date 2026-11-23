import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseRecipe } from '../scripts/cook-links.mjs';
import { parseArgs } from '../scripts/step-images-args.mjs';
import { stepHash, stepTexts } from '../src/lib/step-images';
import manifest from '../src/data/step-images.json';

const dir = 'src/content/recipes/zh/';
const slugs = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));

describe('step pictures', () => {
  // Reads every recipe in one test, which can pass vitest's default 5 s on a busy machine.
  it('reads steps the way the drawing script does', { timeout: 30_000 }, () => {
    for (const slug of slugs) {
      const src = readFileSync(`${dir}${slug}.md`, 'utf8');
      const body = src.replace(/^---\n[\s\S]*?\n---\n/, '');
      expect(stepTexts(body), slug).toEqual(parseRecipe(src).steps);
    }
  });

  it('has a file for every recorded picture', () => {
    for (const [slug, entry] of Object.entries(manifest as Record<string, ({ h: string } | null)[]>)) {
      entry.forEach((e, i) => {
        if (e) expect(existsSync(`public/steps/${slug}/${String(i + 1).padStart(2, '0')}.webp`), `${slug} ${i + 1}`).toBe(true);
      });
    }
  });

  it('hashes like the drawing script', () => {
    // sha1('') starts da39a3ee: the script and the page must agree on the hash.
    expect(stepHash('')).toBe('da39a3ee');
  });
});

describe('step-images command line', () => {
  it('does not take an option value for a slug', () => {
    expect(parseArgs(['draw', '--model', 'gpt-x', 'mapo-tofu', 'dan-dan-mian'])).toEqual({ cmd: 'draw', slugs: ['mapo-tofu', 'dan-dan-mian'] });
    expect(parseArgs(['draw', 'mapo-tofu', '--model', 'gpt-x'])).toEqual({ cmd: 'draw', slugs: ['mapo-tofu'] });
    expect(parseArgs(['run', '--wait', '--limit', '3', '--use-expiring-credits'])).toEqual({ cmd: 'run', slugs: [] });
    expect(parseArgs(['sheet', 'a', '--commit-every', '5', 'b'])).toEqual({ cmd: 'sheet', slugs: ['a', 'b'] });
  });
});
