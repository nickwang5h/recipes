#!/usr/bin/env python3
"""Appends ingredient proposals from rounds 6 and 7 to the catalog. Safe to run again: ids already in the catalog are skipped."""
import re, glob
R = '/Users/congwang/Projects/recipes'
CAT = f'{R}/src/data/ingredients.yaml'
SKIP = {'korean-perilla-leaf', 'gyoza-wrapper', 'sui-mi-ya-cai', 'pork-leg-bones', 'pork-neck-bones'}  # merged into another id
EXTRA = ['- { id: pork-bones, zh: 猪骨, aliases: [猪腿骨, 猪颈骨, 筒骨, 猪大骨], en: Pork bones (neck bones / leg bones), kind: meat, where: asian, pantry: false, substitutes: [] }']
PATCH = {
    'perilla-leaf': lambda l: l.replace('zh: 韩式苏子叶', 'zh: 苏子叶').replace('aliases: [苏子叶, ', 'aliases: [韩式苏子叶, '),
    'dumpling-wrapper': lambda l: l.replace('aliases: [', 'aliases: [日式饺子皮, Gyoza wrappers, ', 1),
    'ya-cai': lambda l: l.replace('aliases: [', 'aliases: [碎米芽菜, ', 1),
    'tilapia': lambda l: l.replace('where: asian', 'where: mainstream'),
}
text = open(CAT).read()
have = set(re.findall(r'^- \{ id: ([\w-]+)', text, re.M))
new = []
for p in sorted(glob.glob(f'{R}/docs/round[67]/proposals/*.yaml')):
    for line in open(p):
        m = re.match(r'- \{ id: ([\w-]+)', line)
        if not m or m.group(1) in have or m.group(1) in SKIP: continue
        have.add(m.group(1)); line = line.rstrip('\n')
        new.append(PATCH.get(m.group(1), lambda l: l)(line))
for line in EXTRA:
    i = re.match(r'- \{ id: ([\w-]+)', line).group(1)
    if i not in have: have.add(i); new.append(line)
# substitutes must point at real ids
for line in new:
    for s in re.findall(r'substitutes: \[([^\]]*)\]', line):
        for i in [x.strip() for x in s.split(',') if x.strip()]:
            if i not in have: print('UNKNOWN SUBSTITUTE', i, 'in', line[:60])
if new:
    head = '' if '# 第六、七轮新增' in text else '\n# 第六、七轮新增（2026-10-02）\n'
    open(CAT, 'w').write(text.rstrip('\n') + '\n' + head + '\n'.join(new) + '\n')
print('added', len(new), 'total', len(have))
