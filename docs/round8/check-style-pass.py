#!/usr/bin/env python3
"""Compares restyled recipes with a snapshot taken before the style pass.
Usage: check-style-pass.py <snapshot-dir> [slug ...] (default: every file that differs)."""
import collections, os, re, sys
R = '/Users/congwang/Projects/recipes/src/content/recipes/zh'
snap = sys.argv[1]
slugs = sys.argv[2:] or [f[:-3] for f in sorted(os.listdir(R)) if os.path.exists(f'{snap}/{f}') and open(f'{R}/{f}').read() != open(f'{snap}/{f}').read()]
NUM = re.compile(r'\d+(?:\.\d+)?')
LINK = re.compile(r'\]\((/[^)]+)\)')
bad = 0
for s in slugs:
    old, new = open(f'{snap}/{s}.md').read(), open(f'{R}/{s}.md').read()
    _, ofm, ob = old.split('---\n', 2)
    _, nfm, nb = new.split('---\n', 2)
    issues = []
    if ofm != nfm: issues.append('front matter changed')
    on, nn = collections.Counter(NUM.findall(ob)), collections.Counter(NUM.findall(nb))
    if on != nn: issues.append(f'numbers: lost {dict(on - nn)} added {dict(nn - on)}')
    if collections.Counter(LINK.findall(ob)) != collections.Counter(LINK.findall(nb)):
        ol, nl = set(LINK.findall(ob)), set(LINK.findall(nb))
        if ol != nl: issues.append(f'links: lost {ol - nl} added {nl - ol}')
    steps = lambda b: len(re.findall(r'^\d+\. ', re.search(r'^## 步骤\n(.*?)(?=^## |\Z)', b, re.M | re.S).group(1), re.M))
    if steps(ob) != steps(nb): issues.append(f'steps {steps(ob)} -> {steps(nb)}')
    tips = lambda b: len(re.findall(r'^- \*\*', b.split('## 要点', 1)[1], re.M)) if '## 要点' in b else 0
    if not 2 <= tips(nb) <= 4: issues.append(f'要点 {tips(nb)}')
    if [h for h in re.findall(r'^## .*', ob, re.M)] != [h for h in re.findall(r'^## .*', nb, re.M)]: issues.append('headings changed')
    n = len(re.sub(r'\s', '', nb))
    if not 550 <= n <= 1150: issues.append(f'length {n}')
    if issues:
        bad += 1
        print(f'{s}:'); [print('   ', i) for i in issues]
print(f'-- {len(slugs)} checked, {bad} with issues')
