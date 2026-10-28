#!/usr/bin/env python3
"""Appends round-8 ingredient proposals that some recipe actually uses to the catalog. Safe to run again."""
import glob, re
R = '/Users/congwang/Projects/recipes'
CAT = f'{R}/src/data/ingredients.yaml'
text = open(CAT).read()
have = set(re.findall(r'^- \{ id: ([\w-]+)', text, re.M))
zh_have = dict(re.findall(r'^- \{ id: ([\w-]+), zh: ([^,]+)', text, re.M))
used = set()
for p in glob.glob(f'{R}/src/content/recipes/zh/*.md'):
    used |= set(re.findall(r'ref: ([\w-]+)', open(p).read()))
new, seen = [], set()
for p in sorted(glob.glob(f'{R}/docs/round8/proposals/*.yaml')):
    for line in open(p):
        m = re.match(r'- \{ id: ([\w-]+), zh: ([^,]+)', line)
        if not m or m.group(1) in have or m.group(1) in seen: continue
        if m.group(1) not in used: print('unused, skipped:', m.group(1)); continue
        for i, zh in zh_have.items():
            if zh == m.group(2): print('SAME zh as catalog', i, '<-', m.group(1))
        seen.add(m.group(1)); new.append(line.rstrip('\n'))
missing = sorted(used - have - seen)
if missing: print('REFS WITH NO ENTRY:', missing)
for line in new:
    for s in re.findall(r'substitutes: \[([^\]]*)\]', line):
        for i in [x.strip() for x in s.split(',') if x.strip()]:
            if i not in have | seen: print('UNKNOWN SUBSTITUTE', i, 'in', line[:60])
if new:
    head = '' if '# 第八轮新增' in text else '\n# 第八轮新增（2026-10-28）\n'
    open(CAT, 'w').write(text.rstrip('\n') + '\n' + head + '\n'.join(new) + '\n')
print('added', len(new))
