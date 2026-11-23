// Principle diagrams (src/assets/diagrams/**.svg) are drawn once, 600 wide, and carry their own phone layout:
// the root's data-narrow="<width> <height>" gives the phone viewBox, and every top-level drawing element says
// where it goes there. Diagram.astro renders both; a container query shows one (src/styles/global.css).
//
//   data-narrow="dx dy"   moved by (dx, dy) in the phone layout (prepended to its own transform)
//   class="wide-only"     dropped from the phone layout (a sideways arrow, a column divider)
//   class="narrow-only"   drawn only in the phone layout, in phone coordinates (the arrow that replaces it)
//   class="lead"          the heading line: drawn in the SVG on wide screens, an HTML line above the phone drawing
//                         (its texts joined by data-join, default a space)
//   class="notes"         the notes under the drawing: same, an HTML list below it. Each <text> child, or each
//                         <g> child holding <text>s, is one line; a <g class="key" data-key="x y w h"> inside
//                         a line is drawn in front of it as a small legend symbol cut to that box.
//
// Long sentences go in notes so they wrap and follow the reader's font size; labels that belong to one part
// of the drawing stay in the SVG and move with it.
//
// An inline <style> applies to the whole document, so every selector is prefixed with the figure's id and
// every id with a per-layout prefix (the two layouts sit in one page).

export const NARROW_MAX_WIDTH = 340;

export interface DiagramLayouts {
  caption?: string;
  wide: string;
  narrow?: { svg: string; lead?: string; notes: string[] };
}

interface Found { start: number; end: number; open: string }

const OPEN = /<([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g;

function classes(open: string): string[] {
  return (open.match(/\sclass="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);
}

// End index (after the closing tag) of the element whose opening tag starts at `start`.
function elementEnd(svg: string, start: number): number {
  OPEN.lastIndex = start;
  const first = OPEN.exec(svg);
  if (!first || first.index !== start) throw new Error(`diagram: no element at ${start}`);
  if (first[3]) return OPEN.lastIndex;
  const tag = first[1];
  const re = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'g');
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(svg); m; m = re.exec(svg)) {
    if (m[1]) depth--;
    else if (!m[2]) depth++;
    if (depth === 0) return re.lastIndex;
  }
  throw new Error(`diagram: <${tag}> at ${start} is not closed`);
}

// Elements carrying class `cls`, outermost only, in document order.
function findClass(svg: string, cls: string): Found[] {
  const found: Found[] = [];
  OPEN.lastIndex = 0;
  for (let m = OPEN.exec(svg); m; m = OPEN.exec(svg)) {
    if (!classes(m[0]).includes(cls)) continue;
    const end = elementEnd(svg, m.index);
    found.push({ start: m.index, end, open: m[0] });
    OPEN.lastIndex = end;
  }
  return found;
}

function cut(svg: string, cls: string): { rest: string; parts: string[] } {
  const found = findClass(svg, cls);
  let rest = svg;
  for (const f of [...found].reverse()) rest = rest.slice(0, f.start) + rest.slice(f.end).replace(/^[ \t]*\n/, '');
  return { rest, parts: found.map((f) => svg.slice(f.start, f.end)) };
}

// Direct children of the element `el` (a full element string).
function children(el: string): string[] {
  const inner = el.slice(el.indexOf('>') + 1, el.lastIndexOf('</'));
  const out: string[] = [];
  OPEN.lastIndex = 0;
  for (let m = OPEN.exec(inner); m; m = OPEN.exec(inner)) {
    const end = elementEnd(inner, m.index);
    out.push(inner.slice(m.index, end));
    OPEN.lastIndex = end;
  }
  return out;
}

const innerOf = (el: string) => el.slice(el.indexOf('>') + 1, el.lastIndexOf('</')).trim();

function textSpan(el: string): string {
  const cls = classes(el.slice(0, el.indexOf('>') + 1));
  const tone = cls.includes('warning') ? 'dg-warning' : cls.includes('muted') ? 'dg-muted' : 'dg-text';
  // A line the wide drawing wraps with <tspan> is one line of HTML.
  const words = innerOf(el).replace(/<tspan\b[^>]*>/g, ' ').replace(/<\/tspan>/g, '').replace(/\s+/g, ' ');
  return `<span class="${tone}">${words}</span>`;
}

function keySvg(el: string): string {
  const box = el.match(/\sdata-key="([^"]+)"/)?.[1];
  const nums = box?.trim().split(/\s+/).map(Number);
  if (!nums || nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) throw new Error('diagram: <g class="key"> needs data-key="x y w h"');
  const ratio = Math.round((nums[2] / nums[3]) * 100) / 100;
  return `<svg class="diagram-key" viewBox="${nums.join(' ')}" style="width:${ratio}em" aria-hidden="true" focusable="false">${innerOf(el)}</svg>`;
}

// One HTML line per child of a lead/notes group.
function htmlLines(group: string): string[] {
  return children(group).map((child) => {
    if (child.startsWith('<text')) return textSpan(child);
    if (!child.startsWith('<g')) throw new Error(`diagram: notes and lead hold <text> or <g>, not ${child.slice(0, 20)}`);
    return children(child).map((c) => (c.startsWith('<text') ? textSpan(c) : classes(c.slice(0, c.indexOf('>') + 1)).includes('key') ? keySvg(c) : '')).join(' ');
  });
}

const partLines = (part: string) => (part.startsWith('<text') ? [textSpan(part)] : htmlLines(part));

function scoped(svg: string, figureId: string, idPrefix: string, cls: string): string {
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  let out = svg.replace(/<style>([\s\S]*?)<\/style>/g, (_, css: string) =>
    `<style>${css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|})(\s*)([^{}@]+?)\s*{/g, (_m, close, ws, sels: string) =>
      `${close}${ws}${sels.split(',').map((s) => `#${figureId} ${s.trim()}`).join(', ')} {`)}</style>`);
  for (const id of ids) {
    out = out
      .replaceAll(`id="${id}"`, `id="${idPrefix}-${id}"`)
      .replaceAll(`href="#${id}"`, `href="#${idPrefix}-${id}"`)
      .replace(/aria-labelledby="([^"]+)"/, (_m, v: string) =>
        `aria-labelledby="${v.split(' ').map((x) => (x === id ? `${idPrefix}-${id}` : x)).join(' ')}"`);
  }
  return out.replace('<svg ', `<svg class="${cls}" `);
}

const ROOT_KEEP = new Set(['title', 'desc', 'style', 'defs']);

export function diagramLayouts(raw: string, figureId: string): DiagramLayouts {
  const svg = raw.replace(/<!--[\s\S]*?-->/g, '');
  const caption = svg.match(/<title[^>]*>([^<]+)<\/title>/)?.[1];
  const rootOpen = svg.match(/<svg\b[^>]*>/)![0];
  const spec = rootOpen.match(/\sdata-narrow="([^"]+)"/)?.[1];
  const plainRoot = rootOpen.replace(/\sdata-narrow="[^"]*"/, '');

  const wideSrc = cut(svg, 'narrow-only').rest.replace(rootOpen, plainRoot).replace(/\sdata-narrow="[^"]*"/g, '');
  const wide = scoped(wideSrc, figureId, figureId, 'diagram-wide');
  if (!spec) return { caption, wide };

  const [w, h] = spec.trim().split(/\s+/).map(Number);
  if (!(w > 0 && h > 0)) throw new Error(`diagram ${figureId}: data-narrow must be "<width> <height>"`);
  if (w > NARROW_MAX_WIDTH) throw new Error(`diagram ${figureId}: phone layout is ${w} wide, at most ${NARROW_MAX_WIDTH}`);

  let src = cut(svg, 'wide-only').rest;
  const lead = cut(src, 'lead'); src = lead.rest;
  const notes = cut(src, 'notes'); src = notes.rest;

  // Everything still drawn must say where it goes.
  for (const child of children(src)) {
    const open = child.slice(0, child.indexOf('>') + 1);
    const tag = open.match(/^<([\w-]+)/)![1];
    if (ROOT_KEEP.has(tag) || classes(open).includes('bg') || classes(open).includes('narrow-only')) continue;
    if (!/\sdata-narrow="/.test(open)) throw new Error(`diagram ${figureId}: ${open} has no place in the phone layout (data-narrow, wide-only, lead or notes)`);
  }

  let narrowSrc = src
    .replace(rootOpen, plainRoot.replace(/viewBox="[^"]*"/, `viewBox="0 0 ${w} ${h}"`))
    .replace(/<rect class="bg"([^>]*?)\swidth="[^"]*"([^>]*?)\sheight="[^"]*"/, `<rect class="bg"$1 width="${w}"$2 height="${h}"`)
    .replace(/<([\w-]+)\b([^>]*?)\sdata-narrow="([^"]+)"([^>]*)>/g, (_m, tag: string, before: string, move: string, after: string) => {
      const [dx, dy] = move.trim().split(/\s+/).map(Number);
      if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error(`diagram ${figureId}: data-narrow="${move}" on <${tag}>`);
      const attrs = before + after;
      const t = attrs.match(/\stransform="([^"]*)"/);
      const moved = `translate(${dx} ${dy})${t ? ' ' + t[1] : ''}`;
      return `<${tag}${t ? attrs.replace(t[0], ` transform="${moved}"`) : `${attrs.replace(/\/$/, '')} transform="${moved}"${attrs.endsWith('/') ? '/' : ''}`}>`;
    });

  return {
    caption,
    wide,
    narrow: {
      svg: scoped(narrowSrc, figureId, `${figureId}-n`, 'diagram-narrow-svg'),
      lead: lead.parts.length ? lead.parts.map((p) => partLines(p).join(p.match(/^<g\b[^>]*\sdata-join="([^"]*)"/)?.[1] ?? ' ')).join(' ') : undefined,
      notes: notes.parts.flatMap(partLines),
    },
  };
}
