#!/bin/zsh
# usage: dispatch.sh <batch-index>
SP=/private/tmp/claude-501/-Users-congwang-Projects/7fedfbb4-8556-4879-92de-6bc2e7293fbc/scratchpad
R=/Users/congwang/Projects/recipes
I=$1
NAME=r6-$(printf %02d $I)
[ -s $SP/r6/$NAME.md ] && exit 0
TASKS=$(python3 -c "
import json; b=json.load(open('$R/docs/round6/batches.json'))[$I]
for n,r in enumerate(b,1):
    comp = '，这是半成品，front matter 加 component: true' if r['component'] else ''
    print(f\"{n}. src/content/recipes/zh/{r['slug']}.md — title: {r['name']}，original: {r['original']}，cuisine: {r['cuisine']}，course: {r['course']}{comp}\")
")
PROMPT="这是一个中文烹饪原理与菜谱笔记站（Astro），仓库在当前目录。读者住在加拿大安大略省，在主流超市和亚洲超市（T&T、H Mart）买菜。

先完整阅读 .agents/skills/writing-recipe-notes/SKILL.md（尤其“页面结构”“来源”“文风”三节）、src/data/ingredients.yaml（食材名录）、范文 src/content/recipes/zh/beurre-blanc.md 和 src/content/recipes/zh/carbonara.md、同菜系的一篇已有菜谱（在 src/content/recipes/zh/ 里找 cuisine 相同的任意一篇），以及 src/content/principles/zh/ 下的原理列表。然后写下面这些菜谱页：

$TASKS

规则（全部照做，不要自行变通，也不要停下来提问）：
- 只新建上面列出的菜谱文件，以及本批的食材提案文件 docs/round6/proposals/$NAME.yaml。不要修改或删除任何其他文件，不要 git commit。
- title、original、cuisine、course、文件名都照上面给的写，不要改。不要写 cover 和 coverAlt 字段，封面另有流程。updated 写 2026-10-02。
- 做法是这道菜在原产地最公认的经典家常版本，不做创新，不做融合。
- 来源已经批准，直接用，不需要再确认：
  · 日本料理：Tsuji《Japanese Cooking: A Simple Art》（1980）；Andoh《Washoku》（2005）；Hachisu《Japan: The Cookbook》（2018）。洋食、拉面、煎饺这类书里没有的菜，用 justonecookbook.com 上对应的那一页。
  · 韩国菜：Maangchi《Maangchi's Real Korean Cooking》（2015）、《Maangchi's Big Book of Korean Cooking》（2019）；maangchi.com 和 koreanbapsang.com 上对应的那一页。
  · 越南菜：Nguyen《Into the Vietnamese Kitchen》（2006）、《The Pho Cookbook》（2017）、《Vietnamese Food Any Day》（2019）；vietworldkitchen.com 上对应的那一页。
  · 泰国菜：Thompson《Thai Food》（2002）、《Thai Street Food》（2010）；Punyaratabandhu《Simple Thai Food》（2014）；hot-thai-kitchen.com 和 shesimmers.com 上对应的那一页。
  每篇列 1–3 条真正用到的来源，至少一条是上面的书或网站。网页必须是本次真的打开过的那一页的正式地址；不引用转载、节选、博客搬运的书中配方。不确定的页码不写。网站文字不要照抄或翻译，只用来核对用量、步骤和时间。
- 用量全部给出数字。“适量”只允许用于盐、胡椒、装饰和煮面水。从 oz、cup、lb 换算来的克数取整到 5 或 10（不要出现 142 g、1360 g 这样的数）。
- 步骤里每个需要等待的动作都写出时间（分钟或小时的数字），同时写出可观察的状态，例如“小火煮 20 分钟，到筷子能轻松扎透”。
- 配料只能引用名录里已有的 id，或你写进提案文件的新 id。提案文件格式与 src/data/ingredients.yaml 相同（每行一个 flow 风格条目，字段 id、zh、aliases、en、kind、where、pantry、substitutes），只放名录里确实没有的食材；en 写加拿大超市货架上的英文名；where 按加拿大实际情况填 mainstream / asian / specialty。先查名录，再看 docs/round6/proposals/ 下其他批次已经提案的条目，那里已有的 id 直接引用、不要重复提案。没有新食材就不要建这个文件。
- 主料在加拿大主流超市买不到时，在该配料的 note 里写一句在哪买或用什么替代。
- principles 只能引用 src/content/principles/zh/ 下已有的 slug。正文链接只指向这些原理，或 src/content/recipes/zh/ 下已有的文件，或 docs/round6/selection.json 里列出的 slug。
- 文件里不要留任何 HTML 注释、待办、给审稿人的话。拿不准的地方写在交稿报告里。
- 不要运行 npm run build、astro build、astro check 或 astro sync（另有多个进程在同一仓库里写作，构建由审稿人统一执行）。

完成后用中文列出：每道菜一句话摘要和所用来源；提案了哪些新食材；需要审稿人重点核对的用量或事实。"
cd $R
codex --search exec -m gpt-6.1-sol -c model_reasoning_effort='"high"' -s workspace-write -C $R --ephemeral -o $SP/r6/$NAME.md "$PROMPT" < /dev/null > $SP/r6/$NAME.log 2>&1
echo "$NAME exit $? $(date +%H:%M)" >> $SP/r6/done.log
