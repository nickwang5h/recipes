#!/usr/bin/env python3
"""Adds tags and minor flags to recipes published before round 8. Safe to run again."""
import re
R = '/Users/congwang/Projects/recipes/src/content/recipes/zh'
BENTO = '''
buta-no-shogayaki chicken-teriyaki chikuzenni hambagu japanese-curry kabocha-no-nimono karaage kinpira-gobo
nikujaga onigiri takikomi-gohan yakisoba saba-no-misoni sake-no-shioyaki tamagoyaki tamago-sando
caponata fagioli-alluccelletto parmigiana-di-melanzane peperonata polpette-al-sugo pollo-alla-cacciatora
lasagne-alla-bolognese frittata arancini focaccia-genovese vitello-tonnato
bulgogi dubu-jorim gamja-jorim gimbap jangjorim japchae jeyuk-bokkeum kongnamul-muchim sigeumchi-namul
kimchi-jeon kimchi-bokkeumbap dak-galbi galbi-jjim gyeran-mari
bo-kho ca-kho-to ga-kho-gung suon-ram-man thit-kho-trung tom-rim dau-sot-ca-chua ga-xao-sa-ot ca-ri-ga ga-nuong-sa
blanquette-de-veau boeuf-bourguignon coq-au-vin cassoulet ratatouille carottes-vichy hachis-parmentier
quiche-lorraine salade-nicoise tomates-farcies poulet-au-vinaigre poulet-roti gratin-dauphinois petits-pois-a-la-francaise
gaeng-garee-gai gaeng-keow-wan-gai gaeng-phed-moo gaeng-massaman panang-neua gai-pad-med-mamuang pad-prik-king
pad-kra-pao khao-pad
bai-cai-zhu-rou-dun-fen-tiao chi-zhi-pai-gu cong-shao-ji-tui fen-zheng-rou fu-ru-rou guang-shi-luo-bo-niu-nan
hao-you-niu-rou he-lan-dou-chao-la-chang hei-jiao-niu-liu hong-shao-ji-chi hong-shao-rou huang-gua-chao-rou
huang-men-ji hui-guo-rou jian-jiao-chao-niu-rou jiang-chao-ji jiang-niu-rou jiang-pai-gu jiao-bai-chao-rou
jing-jiang-rou-si ke-le-ji-chi kung-pao-chicken la-jiao-chao-rou la-wei-he-zheng mao-shi-hong-shao-rou mapo-tofu
mei-cai-kou-rou mi-zhi-cha-shao mu-xu-rou nong-jia-yi-wan-xiang pi-jiu-ya qing-jiao-tu-dou-chao-rou rou-bing-dun-dan
san-bei-ji shan-xi-guo-you-rou shou-rou-tu-dou-pian suan-dou-jiao-rou-mo suan-tai-chao-rou-mo tang-cu-pai-gu
tu-dou-dun-pai-gu xi-hong-shi-niu-nan xi-hong-shi-tu-dou-dun-niu-rou xiang-cun-pi-jiu-ya xiang-gan-qin-cai-chao-rou
xiang-gan-rou-si xiang-gu-hua-ji xiao-chao-huang-niu-rou xiao-chao-rou xiao-ji-dun-mo-gu xin-jiang-da-pan-ji
yang-cong-chao-zhu-rou yu-xiang-qie-zi yu-xiang-rou-si zhu-hou-niu-nan zi-ran-niu-rou dong-an-zi-ji ma-yi-shang-shu
qing-jiao-niang hong-shao-yu
di-san-xian gan-bian-si-ji-dou hong-shao-qie-zi hu-pi-qing-jiao lan-cai-rou-mo-si-ji-dou qie-zi-dun-tu-dou
shou-si-bao-cai suan-la-tu-dou-si su-chao-dou-jiao tomato-egg jiu-cai-chao-dan xiao-chao-ou-ding si-xi-kao-fu
guo-ta-dou-fu song-ren-yu-mi qing-chao-hua-cai suan-rong-xi-lan-hua gan-guo-hua-cai bao-cai-chao-ji-dan-fen-si
cong-jian-dou-fu chao-qie-zi shan-bei-ao-dou-jiao
egg-fried-rice yang-zhou-chao-fan xian-yu-ji-li-chao-fan chao-he-fen tai-shi-lu-rou-fan la-wei-bao-zai-fan
xian-rou-cai-fan xin-jiang-shou-zhua-fan dou-jiao-men-mian yang-pai-men-mian zheng-lu-mian he-nan-zheng-mian-tiao
jiu-cai-he-zi zhong-shi-xian-bing man-tou cha-ye-dan luo-bo-gao xian-rou-bao-zi
'''.split()
ONE_POT = '''
takikomi-gohan yakisoba okonomiyaki kimchi-bokkeumbap dak-galbi budae-jjigae
khao-pad pad-see-ew pad-thai pad-kee-mao
pot-au-feu minestrone ribollita pasta-e-ceci pasta-e-fagioli
xin-jiang-da-pan-ji bai-cai-zhu-rou-dun-fen-tiao yang-zhou-chao-fan xian-yu-ji-li-chao-fan chao-he-fen
dou-jiao-men-mian yang-pai-men-mian zheng-lu-mian he-nan-zheng-mian-tiao xian-rou-cai-fan xin-jiang-shou-zhua-fan
chao-nian-gao xi-hong-shi-ji-dan-gua-mian luo-song-tang
'''.split()
MINOR = '''
tang-ban-xi-hong-shi qing-zheng-nan-gua ji-dan-hua zhu-que-tang zheng-hua-juan tang-xin-dan hua-mei-zhu-mao-dou jiao-yan-yu-mi
'''.split()

for name in set(BENTO) | set(ONE_POT) | set(MINOR):
    p = f'{R}/{name}.md'
    t = open(p).read()  # a typo in the lists fails loudly here
    tags = [x for x, s in (('bento', BENTO), ('one-pot', ONE_POT)) if name in s]
    t = re.sub(r'^(tags|minor):.*\n', '', t, flags=re.M)
    add = (f"tags: [{', '.join(tags)}]\n" if tags else '') + ('minor: true\n' if name in MINOR else '')
    t = re.sub(r'^(course: .*\n)', lambda m: m.group(1) + add, t, count=1, flags=re.M)
    open(p, 'w').write(t)
print(len(set(BENTO)), 'bento', len(set(ONE_POT)), 'one-pot', len(MINOR), 'minor')
