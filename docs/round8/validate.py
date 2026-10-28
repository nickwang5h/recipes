#!/usr/bin/env python3
"""Mechanical checks on round-8 drafts. Usage: validate.py [slug ...] (default: every selected slug that exists)."""
import json, os, re, sys, glob
import yaml
R = '/Users/congwang/Projects/recipes'
sel = {r['slug']: r for rd in ('round8',) for r in json.load(open(f'{R}/docs/{rd}/selection.json'))}
catalog = set(re.findall(r'^- \{ id: ([\w-]+)', open(f'{R}/src/data/ingredients.yaml').read(), re.M))
proposed = {}
for p in sorted(glob.glob(f'{R}/docs/round8/proposals/*.yaml')):
    for m in re.finditer(r'^- \{ id: ([\w-]+), zh: ([^,]+)', open(p).read(), re.M):
        proposed.setdefault(m.group(1), []).append((os.path.basename(p), m.group(2)))
principles = {os.path.basename(p)[:-3] for p in glob.glob(f'{R}/src/content/principles/zh/*.md')}
existing = {os.path.basename(p)[:-3] for p in glob.glob(f'{R}/src/content/recipes/zh/*.md')}
UNITS = {'g', 'ml', '个', '片', '瓣', '根', '茶匙', '汤匙', None}
DOMAINS = ('thewoksoflife.com', 'redhousespice.com', 'omnivorescookbook.com', 'madewithlau.com', 'chinasichuanfood.com', 'cuisineactuelle.fr', 'chefsimon.com', 'seriouseats.com', 'giallozafferano.it', 'lacucinaitaliana.it', 'justonecookbook.com', 'maangchi.com', 'koreanbapsang.com', 'vietworldkitchen.com', 'hot-thai-kitchen.com', 'shesimmers.com', 'canada.ca')
OKVAGUE = {'salt', 'black-pepper', 'white-pepper', 'water'}
slugs = sys.argv[1:] or [s for s in sel if s in existing]
urls = set(); total = 0
for s in slugs:
    issues = []
    t = open(f'{R}/src/content/recipes/zh/{s}.md').read()
    try:
        _, fm, body = t.split('---\n', 2)
        d = yaml.safe_load(fm)
    except Exception as e:
        print(f'{s}: YAML ERROR {e}'); continue
    r = sel[s]
    for k, want in (('title', r['name']), ('original', r['original']), ('cuisine', r['cuisine']), ('course', r['course'])):
        if (d.get(k) or '') != want: issues.append(f'{k}={d.get(k)!r} want {want!r}')
    if (d.get('tags') or []) != r['tags']: issues.append(f"tags={d.get('tags')} want {r['tags']}")
    if 'bento' in r['tags'] and '74°C' not in body: issues.append('bento without reheat note')
    if bool(d.get('component')) != r['component']: issues.append('component flag')
    if 'cover' not in d: issues.append('no cover')
    if str(d.get('updated')) != '2026-10-28': issues.append(f"updated={d.get('updated')}")
    for g in d.get('ingredients', []):
        for it in g['items']:
            ref = it.get('ref')
            if ref not in catalog and ref not in proposed: issues.append(f'unknown ref {ref}')
            if it.get('unit') not in UNITS: issues.append(f"unit {it.get('unit')} ({ref})")
            q = it.get('qty')
            if q is None:
                if ref not in OKVAGUE and not it.get('optional') and '炸' not in str(it.get('note', '')): issues.append(f"no qty: {ref} — {it.get('note','')}")
            else:
                if it.get('unit') in ('g', 'ml') and q >= 10 and q % 5: issues.append(f'unrounded {q}{it.get("unit")} ({ref})')
                if it.get('unit') in ('茶匙', '汤匙') and (q * 4) % 1: issues.append(f'odd spoon {q} ({ref})')
                if it.get('unit') in ('个', '片', '瓣', '根') and (q * 2) % 1: issues.append(f'odd count {q} ({ref})')
    for p in d.get('principles', []):
        if p not in principles: issues.append(f'unknown principle {p}')
    for kind, slug in re.findall(r'\]\(/(recipes|principles)/([\w-]+)/\)', body):
        if kind == 'principles' and slug not in principles: issues.append(f'bad link principle {slug}')
        if kind == 'recipes' and slug not in existing and slug not in sel: issues.append(f'bad link recipe {slug}')
    if re.search(r'\]\((?!/(recipes|principles)/[\w-]+/\))', body): issues.append('other link in body')
    if '<!--' in t: issues.append('html comment')
    m = re.search(r'^## 步骤\n(.*?)(?=^## |\Z)', body, re.M | re.S)
    if not m: issues.append('no 步骤')
    else:
        if not re.search(r'\d\s*(分钟|小时|秒)', m.group(1)) : issues.append('no times in steps')
        if not re.search(r'^1\. ', m.group(1), re.M): issues.append('steps not ordered list')
    if not re.search(r'^## 要点', body, re.M): issues.append('no 要点')
    n = len(re.sub(r'\s', '', body))
    if n < 550 or n > 1150: issues.append(f'length {n}')
    srcs = d.get('sources') or []
    if not 1 <= len(srcs) <= 3: issues.append(f'{len(srcs)} sources')
    for sc in srcs:
        u = sc.get('url')
        if u:
            urls.add(u)
            if not any(dm in u for dm in DOMAINS): issues.append(f'source domain {u}')
    for w in ('适量',):
        for line in body.splitlines():
            if w in line: issues.append(f'body {w}: {line[:40]}')
    if issues:
        total += len(issues)
        print(f'{s}:'); [print('   ', i) for i in issues]
dups = {}
for i, v in proposed.items():
    if i in catalog: print(f'PROPOSAL already in catalog: {i}')
    for f, zh in v: dups.setdefault(zh, set()).add(i)
    if len(v) > 1: print(f'proposal id in several batches: {i} {[f for f,_ in v]}')
for zh, ids in dups.items():
    if len(ids) > 1: print(f'same zh, different ids: {zh} {ids}')
print(f'-- {len(slugs)} files, {total} issues, {len(proposed)} proposed ids, {len(urls)} urls')
open('/private/tmp/claude-501/-Users-congwang-Projects-design-atlas/9ea6e0f3-bcb2-44ad-bcef-5d5a7e615389/scratchpad/r8/urls.txt', 'w').write('\n'.join(sorted(urls)))
