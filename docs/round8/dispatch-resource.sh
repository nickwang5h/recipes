#!/bin/zsh
# usage: dispatch-resource.sh <batch-index> — re-checks one batch drafted without reachable sources
# against a real recipe page and fixes quantities, times and sources.
SP=/private/tmp/claude-501/-Users-congwang-Projects-design-atlas/9ea6e0f3-bcb2-44ad-bcef-5d5a7e615389/scratchpad
R=/Users/congwang/Projects/recipes
I=$1
NAME=r8s-$(printf %02d $I)
mkdir -p $SP/r8
[ -s $SP/r8/$NAME.md ] && exit 0
FILES=$(python3 -c "
import json; b=json.load(open('$R/docs/round8/batches.json'))[$I]
print('\n'.join(f\"- src/content/recipes/zh/{r['slug']}.md（{r['name']}，{r['original']}）\" for r in b))
")
CUISINE=$(python3 -c "import json; print(json.load(open('$R/docs/round8/batches.json'))[$I][0]['cuisine'])")
case $CUISINE in
  vietnamese) SRC="vietworldkitchen.com、delightfulplate.com、runawayrice.com，或 Nguyen《Into the Vietnamese Kitchen》（2006）、《Vietnamese Food Any Day》（2019）" ;;
  french) SRC="cuisineactuelle.fr、cuisineaz.com、elle.fr（Elle à table）、ricardocuisine.com 的法式条目，或 Child《Mastering the Art of French Cooking》（1961）、Pépin《Jacques Pépin's Complete Techniques》（2001）" ;;
  thai) SRC="shesimmers.com、rachelcooksthai.com、importfood.com、thaitable.com、templeofthai.com，或 Punyaratabandhu《Simple Thai Food》（2014）、Thompson《Thai Food》（2002）。hot-thai-kitchen.com 打不开（402），不要用" ;;
  italian) SRC="ricette.giallozafferano.it（编辑部食谱，不是 blog.giallozafferano.it）、lacucinaitaliana.it、cucchiaio.it，或 Hazan《Essentials of Classic Italian Cooking》（1992）" ;;
esac
PROMPT="这是一个中文菜谱站（Astro），仓库在当前目录。下面几篇菜谱是另一个模型起草的。它列的来源页面打不开，或者只是网友投稿、做法相近的页面，用量、温度和时间都没有核对过：

$FILES

你的任务是给每篇找一个真正的来源，并按来源改正用量和做法。

1. 先读 .agents/skills/writing-recipe-notes/SKILL.md、docs/round8/README.md、docs/round8/style-pass.md 和上面每篇稿子。
2. 用你的搜索工具，在这些网站上找这道菜本身的配方页：$SRC。每篇至少打开一页，确认页面上有完整的配料用量和做法步骤。只列配料、没有步骤的页面不算。
3. 对照来源逐项核对稿子：配料和用量（按份数折算）、烤箱温度、各步时间、关键做法。和来源不一致的，改成来源的数字；来源没写、稿子里是估计的数字，能在第二个来源找到就用第二个来源的，找不到就保留稿子的数字，并在报告里列出来。
4. sources 换成你真的打开过、内容支持稿子的页面（1–3 条）。原来的网友博客页，如果新来源已经覆盖就删掉。Health Canada 那条保留。
5. 改正文时保持 docs/round8/style-pass.md 的文风，结构规则照 SKILL.md。front matter 里只改 ingredients、time、servings、sources；title、original、cuisine、course、tags、summary 不动（summary 跟着做法改了的除外）。带 bento 标签、冷着吃的菜（沙拉、米沙拉），带饭那条写冷藏保存和吃前在室温放多久，不写复热。
6. 需要新食材时，写进 docs/round8/proposals/$NAME.yaml（格式同 src/data/ingredients.yaml，先查名录和 docs/round8/proposals/ 下已有的提案）。
7. 只改上面列出的文件和这个提案文件。不要运行 npm、astro、git。

完成后用中文列出：每篇用的新来源（网址）；按来源改了哪些数字或做法（改前→改后）；仍然没有来源支持、保留了估计值的数字。"
cd $R
codex --search exec -m gpt-6.1-terra -c model_reasoning_effort='"high"' -s workspace-write -C $R --ephemeral -o $SP/r8/$NAME.md "$PROMPT" < /dev/null > $SP/r8/$NAME.log 2>&1
echo "$NAME exit $? $(date +%H:%M)" >> $SP/r8/done.log
