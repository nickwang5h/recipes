#!/bin/zsh
# usage: dispatch.sh <batch-index>
SP=/private/tmp/claude-501/-Users-congwang-Projects-design-atlas/9ea6e0f3-bcb2-44ad-bcef-5d5a7e615389/scratchpad
R=/Users/congwang/Projects/recipes
I=$1
NAME=r8-$(printf %02d $I)
mkdir -p $SP/r8
[ -s $SP/r8/$NAME.md ] && exit 0
TASKS=$(python3 -c "
import json; b=json.load(open('$R/docs/round8/batches.json'))[$I]
for n,r in enumerate(b,1):
    orig = f\"，original: {r['original']}\" if r['original'] else ''
    tags = f\"，tags: [{', '.join(r['tags'])}]\" if r['tags'] else '，不写 tags'
    print(f\"{n}. src/content/recipes/zh/{r['slug']}.md — title: {r['name']}{orig}，cuisine: {r['cuisine']}，course: {r['course']}{tags}\")
")
CUISINE=$(python3 -c "import json; print(json.load(open('$R/docs/round8/batches.json'))[$I][0]['cuisine'])")
case $CUISINE in
  chinese) SRC="Dunlop《The Food of Sichuan》（2019）、《Revolutionary Chinese Cookbook》（湘菜，2006）、《Land of Fish and Rice》（江南，2016）；Grace Young《The Breath of a Wok》（2004）；《中国烹饪百科全书》（1992）。书里查不到或你无法打开书时，用这些网站上对应的那一页：thewoksoflife.com、redhousespice.com、omnivorescookbook.com、madewithlau.com（粤菜）、chinasichuanfood.com。不改编 HowToCook。" ;;
  japanese) SRC="Tsuji《Japanese Cooking: A Simple Art》（1980）；Andoh《Washoku》（2005）；Hachisu《Japan: The Cookbook》（2018）。书里没有的家常菜和便当菜，用 justonecookbook.com 上对应的那一页。" ;;
  korean) SRC="Maangchi《Maangchi's Real Korean Cooking》（2015）、《Maangchi's Big Book of Korean Cooking》（2019）；maangchi.com 和 koreanbapsang.com 上对应的那一页。" ;;
  vietnamese) SRC="Nguyen《Into the Vietnamese Kitchen》（2006）、《Vietnamese Food Any Day》（2019）；vietworldkitchen.com 上对应的那一页。" ;;
  thai) SRC="Thompson《Thai Food》（2002）、《Thai Street Food》（2010）；Punyaratabandhu《Simple Thai Food》（2014）；hot-thai-kitchen.com 和 shesimmers.com 上对应的那一页。" ;;
  french) SRC="Child 等《Mastering the Art of French Cooking》（1961）；Pépin《Jacques Pépin's Complete Techniques》（2001）。书里没有的家常菜，用这些网站上对应的那一页：cuisineactuelle.fr、chefsimon.com、seriouseats.com。" ;;
  italian) SRC="Hazan《Essentials of Classic Italian Cooking》（1992）；Artusi《La scienza in cucina e l'arte di mangiar bene》（1891）。书里没有的家常菜，用这些网站上对应的那一页：giallozafferano.it、lacucinaitaliana.it、seriouseats.com。" ;;
esac
PROMPT="这是一个中文烹饪原理与菜谱笔记站（Astro），仓库在当前目录。读者住在加拿大安大略省，在主流超市和亚洲超市（T&T、H Mart）买菜。这一批菜是给工作日吃的：能带饭、一锅出，或者是大家常做的家常主菜。

先完整阅读 .agents/skills/writing-recipe-notes/SKILL.md（尤其“页面结构”“来源”“文风”三节）、docs/round8/README.md（标签标准）、src/data/ingredients.yaml（食材名录）、src/content.config.ts 里 recipes 的字段定义、范文 src/content/recipes/zh/beurre-blanc.md 和 src/content/recipes/zh/carbonara.md、同菜系的一篇已有菜谱（在 src/content/recipes/zh/ 里找 cuisine 相同的任意一篇），以及 src/content/principles/zh/ 下的原理列表。中餐还要读相关的地方菜系页（src/content/regions/zh/ 下，如果这道菜属于其中一个地方）。然后写下面这些菜谱页：

$TASKS

规则（全部照做，不要自行变通，也不要停下来提问）：
- 只新建上面列出的菜谱文件，以及本批的食材提案文件 docs/round8/proposals/$NAME.yaml。不要修改或删除任何其他文件，不要 git commit。
- title、original、cuisine、course、tags、文件名都照上面给的写，不要改。中餐菜谱不写 original 字段。不要写 cover 和 coverAlt 字段，封面另有流程。updated 写 2026-10-28。
- 做法是这道菜在原产地最公认的经典家常版本，不做创新，不做融合。用量按家里一顿饭的份量，servings 写 2 或 4。
- 带 bento 标签的菜，## 要点 里有一条写带饭：装盒前要注意什么（比如汁收得更干、蔬菜少炒一点），第二天复热到中心 74°C。带 one-pot 标签的菜，步骤里全程只用一口锅、一个电饭煲或一个烤盘。
- 来源已经批准，直接用，不需要再确认：$SRC
  每篇列 1–3 条真正用到的来源。网页必须是本次真的打开过的那一页的正式地址；不引用转载、节选、博客搬运的书中配方。没有亲自翻到对应配方的书不要列为来源，不确定的页码不写。网站文字不要照抄或翻译，只用来核对用量、步骤和时间。
- 标题带地名或菜系的菜，用量和步骤必须是那个地方的做法。
- 用量全部给出数字。“适量”只允许用于盐、胡椒、装饰和煮面水。从 oz、cup、lb 换算来的克数取整到 5 或 10（不要出现 142 g、1360 g 这样的数）。
- 步骤里每个需要等待的动作都写出时间（分钟或小时的数字），同时写出可观察的状态，例如“小火煮 20 分钟，到筷子能轻松扎透”。
- time.prep 和 time.cook 写实际要花的时间；腌制、泡发这类等待也算进 prep，但不要为了省时间改掉经典做法里必要的步骤。
- 配料只能引用名录里已有的 id，或你写进提案文件的新 id。提案文件格式与 src/data/ingredients.yaml 相同（每行一个 flow 风格条目，字段 id、zh、aliases、en、kind、where、pantry、substitutes），只放名录里确实没有的食材；en 写加拿大超市货架上的英文名；where 按加拿大实际情况填 mainstream / asian / specialty。先查名录，再看 docs/round8/proposals/ 下其他批次已经提案的条目，那里已有的 id 直接引用、不要重复提案。没有新食材就不要建这个文件。
- 主料在加拿大主流超市买不到时，在该配料的 note 里写一句在哪买或用什么替代。
- principles 只能引用 src/content/principles/zh/ 下已有的 slug。正文链接只指向这些原理，或 src/content/recipes/zh/ 下已有的文件，或 docs/round8/selection.json 里列出的 slug。
- 文件里不要留任何 HTML 注释、待办、给审稿人的话。拿不准的地方写在交稿报告里。
- 不要运行 npm run build、astro build、astro check 或 astro sync（另有多个进程在同一仓库里写作，构建由审稿人统一执行）。

完成后用中文列出：每道菜一句话摘要和所用来源；提案了哪些新食材；需要审稿人重点核对的用量或事实。"
[ -n "$PRINT_ONLY" ] && { print -r -- "$PROMPT"; exit 0; }
cd $R
codex --search exec -m gpt-6.1-sol -c model_reasoning_effort='"high"' -s workspace-write -C $R --ephemeral -o $SP/r8/$NAME.md "$PROMPT" < /dev/null > $SP/r8/$NAME.log 2>&1
echo "$NAME exit $? $(date +%H:%M)" >> $SP/r8/done.log
