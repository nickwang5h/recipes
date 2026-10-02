#!/bin/zsh
SP=/private/tmp/claude-501/-Users-congwang-Projects/7fedfbb4-8556-4879-92de-6bc2e7293fbc/scratchpad
R=/Users/congwang/Projects/recipes
I=$1
NAME=audit-$(printf %02d $I)
[ -s $SP/audit/$NAME.md ] && exit 0
RD=$(python3 -c "import json;print(json.load(open('$SP/audit/batches.json'))[$I][0])")
FILES=$(python3 -c "
import json
for s in json.load(open('$SP/audit/batches.json'))[$I][1]: print('- src/content/recipes/zh/'+s+'.md')
")
PROMPT="这是一个中文菜谱站（Astro），仓库在当前目录。下面这些菜谱是今天新起草的，每篇 front matter 的 sources 列了它依据的网页。你的任务是做数字核对：把每篇的用量和时间逐项和它自己列的来源网页对一遍，写一份核对表。只核对，不改菜谱。

要核对的文件：
$FILES

做法（全部照做，不要自行变通，也不要停下来提问）：
1. 只新建一个文件：docs/$RD/audit/$NAME.md。不修改任何菜谱文件，不改其他文件，不 git commit，不运行构建。
2. 对每篇菜谱：打开 sources 里的每个 url（Health Canada 的熟度页不用核）。打不开的写明返回了什么，然后这一篇标“来源打不开，未核对”。
3. 每篇写一张配料表，一行一个配料，列：配料；本稿用量；来源原文用量（照抄原单位，如 1/4 cup、2 tbsp、1 lb）；来源换算成公制后的数；结论。结论只能是：“一致”（换算后相差不超过 15%，或属于正常取整）、“不一致”（写出相差多少）、“来源没有这一项”、“本稿没有这一项”（来源有而本稿没写的配料另起一行）。本稿份数和来源份数不同的，先按份数比例折算再比。
4. 每篇再写一张时间与温度表，一行一个带时间或温度的步骤，列：步骤号；本稿写的时间或温度；来源写的；结论（“一致”“不一致”“来源没写，本稿是估计”）。
5. 每篇最后一行写 front matter 的 servings、time.prep、time.cook 与来源是否对得上。
6. 文件最前面写“需要处理的差异”清单：只列结论为“不一致”和“本稿没有这一项”的条目，每条一行，格式：菜谱文件名｜项目｜本稿｜来源｜建议改成什么。没有差异就写“无”。
7. 换算用这些数：1 cup = 240 ml，1 tbsp = 15 ml，1 tsp = 5 ml，1 oz = 28 g，1 lb = 454 g；面粉 1 cup = 125 g，白糖 1 cup = 200 g，生米 1 cup = 200 g。来源同时给了公制的以来源的公制为准。
8. 只报告数字事实。不评价文风，不建议改写，不评价哪个版本更正宗。"
cd $R
codex --search exec -m gpt-6.1-sol -c model_reasoning_effort='"high"' -s workspace-write -C $R --ephemeral -o $SP/audit/$NAME.md "$PROMPT" < /dev/null > $SP/audit/$NAME.log 2>&1
echo "$NAME exit $? $(date +%H:%M)" >> $SP/audit/done.log
