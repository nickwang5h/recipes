#!/usr/bin/env python3
"""Adds cover and coverAlt to round-8 recipes whose cover image is installed. Safe to run again."""
import json, os, re
R = '/Users/congwang/Projects/recipes'
for r in json.load(open(f'{R}/docs/round8/selection.json')):
    p, img = f"{R}/src/content/recipes/zh/{r['slug']}.md", f"{R}/src/assets/covers/recipes/{r['slug']}.jpg"
    if not (os.path.exists(p) and os.path.exists(img)): continue
    t = open(p).read()
    if re.search(r'^cover:', t, re.M): continue
    t = t.replace('---\n', f"---\ncover: ../../../assets/covers/recipes/{r['slug']}.jpg\ncoverAlt: {r['name']}装盘后的插画\n", 1)
    open(p, 'w').write(t); print('cover', r['slug'])
