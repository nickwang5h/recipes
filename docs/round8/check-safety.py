#!/usr/bin/env python3
"""Lists food-safety sentences that a restyle dropped. Usage: check-safety.py <snapshot-dir>"""
import os, re, sys
R = '/Users/congwang/Projects/recipes/src/content/recipes/zh'
snap = sys.argv[1]
KEY = re.compile(r'弃|扔|丢掉|倒掉|毒|细菌|微生物|李斯特|沙门|室温|冷藏|小时内|不超过 \d+ 小时|孕妇|幼儿|生食|未熟|变质|腐败|发黏|异味|不开口|不闭合|活的')
def sentences(body):
    return [s for s in re.split(r'(?<=[。；！？\n])', body) if KEY.search(s)]
for f in sorted(os.listdir(R)):
    if not os.path.exists(f'{snap}/{f}'): continue
    old = open(f'{snap}/{f}').read().split('---\n', 2)[2]
    new = open(f'{R}/{f}').read().split('---\n', 2)[2]
    if old == new: continue
    newkeys = set(KEY.findall(new))
    lost = [s.strip() for s in sentences(old) if not any(k in newkeys for k in KEY.findall(s))]
    if lost:
        print(f'{f[:-3]}:'); [print('   ', s[:120]) for s in lost]
