// Principle diagrams carry a phone layout next to the 600-wide one (src/lib/diagram.ts). This checks every
// diagram has one that builds, and that each English copy is the Chinese drawing with only its words changed,
// so a layout fixed in one language is fixed in the other.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diagramLayouts, NARROW_MAX_WIDTH } from '../src/lib/diagram';

const dir = new URL('../src/assets/diagrams/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
const read = (path: string) => readFileSync(new URL(path, dir), 'utf8');

// The drawing without its words: text elements, title, desc and the font line differ between languages.
const shape = (svg: string) =>
  svg
    .replace(/<(text|title|desc)\b[^>]*>.*?<\/\1>/g, '')
    .replace(/^\s*\.label \{ font:.*$/m, '')
    .replace(/\n\s*\n/g, '\n');

describe('diagrams', () => {
  for (const file of files) {
    for (const path of [file, `en/${file}`]) {
      it(`${path} has a phone layout`, () => {
        const d = diagramLayouts(read(path), 'dg-test');
        expect(d.narrow, 'root needs data-narrow="<width> <height>"').toBeDefined();
        const width = Number(d.narrow!.svg.match(/viewBox="0 0 (\d+)/)![1]);
        expect(width).toBeLessThanOrEqual(NARROW_MAX_WIDTH);
        expect(d.wide).not.toMatch(/data-narrow|narrow-only/);
        expect(d.narrow!.svg).not.toMatch(/data-narrow|wide-only|class="(lead|notes)"/);
      });
    }
    it(`en/${file} is the same drawing`, () => {
      expect(shape(read(`en/${file}`))).toBe(shape(read(file)));
    });
  }
});
