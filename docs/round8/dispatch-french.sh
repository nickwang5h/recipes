#!/bin/zsh
# One-off: the French drafts the first re-sourcing pass bent toward whatever variant page it found.
SP=/private/tmp/claude-501/-Users-congwang-Projects-design-atlas/9ea6e0f3-bcb2-44ad-bcef-5d5a7e615389/scratchpad
R=/Users/congwang/Projects/recipes
NAME=r8f-$1
[ -s $SP/r8/$NAME.md ] && exit 0
case $1 in
  a) FILES="- src/content/recipes/zh/salade-de-lentilles.md（法式扁豆沙拉：经典是绿扁豆（lentilles vertes du Puy）煮到刚软、趁热拌第戎芥末油醋汁，加红葱头和欧芹，常配一点培根丁或水煮蛋可选；不配沙拉叶和橄榄酱）
- src/content/recipes/zh/saucisses-aux-lentilles.md（香肠炖扁豆：经典是图卢兹香肠或 Morteau 香肠和绿扁豆、胡萝卜、洋葱、培根丁在一口锅里炖）" ;;
  b) FILES="- src/content/recipes/zh/poulet-basquaise.md（巴斯克炖鸡：经典是带骨鸡块煎上色，和洋葱、红青椒、番茄、巴约讷火腿、白葡萄酒、Espelette 辣椒粉一起炖；不加奶油和辣肠）
- src/content/recipes/zh/saumon-en-papillote.md（纸包三文鱼：经典是三文鱼配柠檬片、香草、少量蔬菜丝（番茄、西葫芦、胡萝卜或韭葱）和橄榄油或黄油封包烤；不用奶油和意大利香醋）
- src/content/recipes/zh/tian-provencal.md（普罗旺斯烤蔬菜：经典是茄子、西葫芦、番茄切片竖排在炒软的洋葱上，橄榄油、蒜、百里香，烤到软；不加奶酪）" ;;
esac
PROMPT="这是一个中文菜谱站（Astro），仓库在当前目录。下面几篇法国家常菜，第一版稿子的来源不够，另一个模型补来源时又把做法改成了它碰巧找到的变体。你的任务：把每篇写回这道菜公认的经典家常做法，并找到支持这个做法的来源。括号里写了经典做法的要点：

$FILES

1. 先读 .agents/skills/writing-recipe-notes/SKILL.md、docs/round8/README.md、docs/round8/style-pass.md 和每篇现在的稿子。
2. 用搜索工具找经典做法的配方页：首选 cuisineactuelle.fr、cuisineaz.com、elle.fr（Elle à table）、marmiton.org 上评分多的经典版本、ricardocuisine.com，或 Child《Mastering the Art of French Cooking》、Pépin 的书。每篇至少打开两页，挑和括号里经典要点一致、配料用量和步骤完整的那一页做主来源。如果找到的页面是变体（加奶油、加奶酪、换配菜），换一页，不要照着变体改。
3. 按主来源核对并改正配料用量（按份数折算）、温度、时间和步骤；第二个来源只用来补主来源没给的数字。两个来源都没有的数字保留稿子原值，报告里列出来。
4. sources 写真的打开过的页面（1–3 条），保留 Health Canada 那条。summary 跟着做法改。
5. 文风照 docs/round8/style-pass.md，结构照 SKILL.md。front matter 的 title、original、cuisine、course、tags 不动。带 bento 标签、冷着吃的扁豆沙拉，带饭那条写冷藏保存和吃前在室温放多久，不写复热。
6. 需要新食材时，先查 src/data/ingredients.yaml 和 docs/round8/proposals/ 下所有提案，已有的直接用；确实没有的写进 docs/round8/proposals/$NAME.yaml。旧稿引用了现在不用的提案食材，就从稿子里去掉。
7. 只改上面列出的文件和这个提案文件。不要运行 npm、astro、git。

完成后用中文列出：每篇的主来源和第二来源（网址）；和经典要点对照，做法改了什么；保留的估计值。"
cd $R
codex --search exec -m gpt-6.1-terra -c model_reasoning_effort='"high"' -s workspace-write -C $R --ephemeral -o $SP/r8/$NAME.md "$PROMPT" < /dev/null > $SP/r8/$NAME.log 2>&1
echo "$NAME exit $? $(date +%H:%M)" >> $SP/r8/done.log
