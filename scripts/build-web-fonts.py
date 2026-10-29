#!/usr/bin/env python3
"""Cut the two web fonts into unicode-range slices that match what this site draws.

A browser downloads a slice only when the page draws one of its characters in that font, so
the slices are cut by how many pages draw each character, separately for each font:
the sans face carries the interface and ingredient lists, the reading face carries headings and
the steps, and they share few rare characters. The first slice of each font holds what almost
every page draws, later slices get rarer; characters the site never draws sit in large slices
that load only if they ever show up (a note someone types, say). Every character of each source
font lands in exactly one slice, so new content never needs a rebuild to render; rerun this
when the content has shifted enough that pages pull in many small slices.

Inputs:
  fonts/source-han-sans-sc.woff2, fonts/lxgw-wenkai-regular.ttf   source fonts (not in git; the
      same files nickwang.xyz used: its repo history has the first, its fonts/ folder the second)
  a census from scripts/font-census.mjs: per page, the characters each font draws

On top of the shared slices, each page in the census gets one small file per font holding just its
less common characters (src/data/page-fonts.json, which Base.astro turns into @font-face rules on
that page). They belong to a family of their own, listed first in the font stacks, so the browser
takes those characters from the page's file and never asks the shared family for them.
A page edited since the census still renders: anything its own file lacks comes from the shared slices.

Writes public/fonts/<slug>/<hash>.woff2 (new names whenever the cut changes, so a service worker's
cached copies of old slices are never mixed with new ranges), public/fonts/page/<hash>.woff2,
public/fonts/faces-<hash>.css (the shared @font-face rules) and src/data/page-fonts.json.

Requires fontTools and brotli: `uv run --with fonttools --with brotli scripts/build-web-fonts.py census.json`.
"""

from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / 'fonts'
SLICE_DIR = ROOT / 'public' / 'fonts'
# The @font-face rules: a file of their own that pages load without waiting for it (the per-page
# rules are inline), named by its content so caches never serve an old cut.
CSS_NAME = 'faces-{}.css'
PAGE_DIR = SLICE_DIR / 'page'
PAGE_MANIFEST = ROOT / 'src' / 'data' / 'page-fonts.json'
# A page that draws fewer of the first slice's characters than this (an English page with a
# Chinese dish name, say) takes them in its own file instead of fetching the whole first slice.
FEW_COMMON = 80

FONTS = [
    {'family': 'Source Han Sans SC', 'page_family': 'Kiki Page Sans', 'source': 'source-han-sans-sc.woff2', 'slug': 'source-han-sans-sc', 'weight': '250 900', 'census': 'sans'},
    {'family': 'LXGW WenKai', 'page_family': 'Kiki Page Reading', 'source': 'lxgw-wenkai-regular.ttf', 'slug': 'lxgw-wenkai', 'weight': '400', 'census': 'reading'},
]

# Characters drawn on this share of pages or more go in the first slice; the rest by frequency in
# small slices, so a page with a few unusual characters fetches a few small files.
FIRST_SHARE = 0.08
USED_SLICE = 120
UNUSED_SLICE_SIZE = 2000
NON_CJK_SLICE_SIZE = 600
LATIN = set(range(0x20, 0x250)) | set(range(0x2000, 0x2070)) | {0x20AC, 0x2122, 0x2212, 0xFEFF, 0xFFFD}


def is_cjk(cp: int) -> bool:
    return (
        0x2E80 <= cp <= 0x2FDF
        or 0x3000 <= cp <= 0x303F
        or 0x3100 <= cp <= 0x31BF
        or 0x31C0 <= cp <= 0x31EF
        or 0x3200 <= cp <= 0x9FFF
        or 0xF900 <= cp <= 0xFAFF
        or 0xFE30 <= cp <= 0xFE4F
        or 0xFF00 <= cp <= 0xFFEF
        or cp >= 0x20000
    )


def page_frequency(census: dict, key: str) -> tuple[Counter[int], int]:
    """How many pages draw each character in this font, at either width (Latin aside)."""
    counts: Counter[int] = Counter()
    for widths in census.values():
        chars = set()
        for drawn in widths.values():
            chars.update(ord(ch) for ch in drawn[key] if ord(ch) not in LATIN)
        counts.update(chars)
    return counts, len(census)


def plan_slices(cmap: set[int], frequency: Counter[int], pages: int) -> dict[str, list[list[int]]]:
    non_cjk = sorted(cp for cp in cmap if not is_cjk(cp))
    latin = [cp for cp in non_cjk if cp in LATIN]
    other = [cp for cp in non_cjk if cp not in LATIN]
    # Arrows, ℃, × and the like the site uses: one small slice, not a 600-symbol one each.
    symbols = [cp for cp in other if frequency[cp]]
    other = [cp for cp in other if not frequency[cp]]
    cjk = [cp for cp in cmap if is_cjk(cp)]
    used = sorted((cp for cp in cjk if frequency[cp]), key=lambda cp: (-frequency[cp], cp))
    unused = sorted(cp for cp in cjk if not frequency[cp])
    first = [cp for cp in used if frequency[cp] >= FIRST_SHARE * pages]
    rest = used[len(first):]
    return {
        'base': [latin] + ([symbols] if symbols else []) + [other[i:i + NON_CJK_SLICE_SIZE] for i in range(0, len(other), NON_CJK_SLICE_SIZE)],
        'rare': [unused[i:i + UNUSED_SLICE_SIZE] for i in range(0, len(unused), UNUSED_SLICE_SIZE)],
        'common': ([first] if first else []) + [rest[i:i + USED_SLICE] for i in range(0, len(rest), USED_SLICE)],
    }


def unicode_range(codepoints: list[int]) -> str:
    runs, ordered = [], sorted(codepoints)
    start = prev = ordered[0]
    for cp in ordered[1:]:
        if cp != prev + 1:
            runs.append((start, prev))
            start = cp
        prev = cp
    runs.append((start, prev))
    return ','.join(f'U+{a:X}' if a == b else f'U+{a:X}-{b:X}' for a, b in runs)


def subset(job: tuple[str, str, list[int]]) -> None:
    # Same options as the slices this replaces, so every glyph is drawn exactly as before.
    from fontTools import subset as ft_subset
    from fontTools.ttLib import TTFont

    source, output, codepoints = job
    options = ft_subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    options.name_IDs = ['*']
    options.name_languages = ['*']
    options.notdef_outline = True
    options.hinting = False
    options.desubroutinize = True
    font = TTFont(source)
    subsetter = ft_subset.Subsetter(options)
    subsetter.populate(unicodes=codepoints)
    subsetter.subset(font)
    ft_subset.save_font(font, output, options)


def face(family: str, weight: str, url: str, codepoints: list[int], display: str = 'swap') -> str:
    return (
        '@font-face {\n'
        f'  font-family: "{family}";\n'
        f"  src: url('{url}') format('woff2');\n"
        '  font-style: normal;\n'
        f'  font-weight: {weight};\n'
        f'  font-display: {display};\n'
        f'  unicode-range: {unicode_range(codepoints)};\n'
        '}\n'
    )


def main() -> None:
    from fontTools.ttLib import TTFont

    census = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    css = ['/* Generated by scripts/build-web-fonts.py from a page census. Do not edit by hand. */\n']
    jobs: list[tuple[str, str, list[int]]] = []
    pages: dict[str, list[dict]] = {}
    for d in (PAGE_DIR, *(SLICE_DIR / f['slug'] for f in FONTS)):
        d.mkdir(parents=True, exist_ok=True)
        for old in d.glob('*.woff2'):
            old.unlink()

    for font in FONTS:
        source = SOURCE_DIR / font['source']
        cmap = set(TTFont(source).getBestCmap())
        frequency, total = page_frequency(census, font['census'])
        slices = plan_slices(cmap, frequency, total)
        # Every slice claims exactly its own characters. Chrome fetches every face whose range covers
        # a character on the page, so overlapping ranges would pull in large slices for nothing.
        for kind in ('base', 'rare', 'common'):
            for index, codepoints in enumerate(slices[kind]):
                name = f'{kind[0]}{index:03d}-{digest(font["source"], codepoints)}.woff2'
                jobs.append((str(source), str(SLICE_DIR / font['slug'] / name), codepoints))
                # The slices nearly every page draws (Latin, the site's symbols, the first common slice) wait a
                # moment (100 ms) for their file before drawing a fallback: on a fast connection they arrive in
                # time and the page doesn't jump while lines mix web and fallback glyphs (CLS); on a slow one
                # the text still shows at once instead of waiting for the font.
                display = 'fallback' if (kind == 'base' and index < 2) or (kind == 'common' and index == 0) else 'swap'
                css.append(face(font['family'], font['weight'], f"/fonts/{font['slug']}/{name}", codepoints, display))

        # Each page's own file, under its own family name (first in the --font-sans and --font-reading
        # stacks): the characters it draws in this font beyond Latin and the first slice. A character
        # this family covers never reaches the shared family, so no shared slice is fetched for it.
        first = set(slices['common'][0]) if slices['common'] else set()
        for path, widths in census.items():
            drawn = set()
            for chars in widths.values():
                drawn.update(ord(ch) for ch in chars[font['census']] if ord(ch) not in LATIN and ord(ch) in cmap)
            own = drawn if len(drawn & first) < FEW_COMMON else drawn - first
            if not own:
                continue
            codepoints = sorted(own)
            name = f'{font["slug"][:2]}-{digest(font["source"], codepoints)}.woff2'
            if not (PAGE_DIR / name).exists() and all(j[1] != str(PAGE_DIR / name) for j in jobs):
                jobs.append((str(source), str(PAGE_DIR / name), codepoints))
            pages.setdefault(path, []).append({'family': font['page_family'], 'weight': font['weight'], 'src': f'/fonts/page/{name}', 'range': unicode_range(codepoints)})
        print(f"{font['family']}: {len(slices['common'])} common slices ({sum(map(len, slices['common']))} characters), "
              f"first slice {len(first)}, {len(slices['rare'])} rare, {len(slices['base'])} base")

    with ProcessPoolExecutor() as pool:
        list(pool.map(subset, jobs))
    text = ''.join(css)
    for old in SLICE_DIR.glob('faces-*.css'):
        old.unlink()
    name = CSS_NAME.format(hashlib.sha1(text.encode()).hexdigest()[:10])
    (SLICE_DIR / name).write_text(text, encoding='utf-8')
    manifest = {'css': f'/fonts/{name}', 'pages': pages}
    PAGE_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    shared = sum(p.stat().st_size for f in FONTS for p in (SLICE_DIR / f['slug']).glob('*.woff2'))
    own = sorted(p.stat().st_size for p in PAGE_DIR.glob('*.woff2'))
    print(f'{len(jobs)} files: shared {shared / 1_048_576:.1f} MiB; {len(own)} page files, median {own[len(own) // 2] / 1024:.0f} KB')


def digest(source: str, codepoints: list[int]) -> str:
    return hashlib.sha1(f"{source}:{','.join(map(str, codepoints))}".encode()).hexdigest()[:10]


if __name__ == '__main__':
    main()
