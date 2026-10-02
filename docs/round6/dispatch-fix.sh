#!/bin/zsh
SP=/private/tmp/claude-501/-Users-congwang-Projects/7fedfbb4-8556-4879-92de-6bc2e7293fbc/scratchpad
R=/Users/congwang/Projects/recipes
I=$1
NAME=fix-$(printf %02d $I)
[ -s $SP/fix/$NAME.md ] && exit 0
FILES=$(python3 -c "
import json
for s in json.load(open('$SP/fix/batches.json'))[$I]: print('- src/content/recipes/zh/'+s+'.md')
")
PROMPT="这是一个中文菜谱站（Astro），仓库在当前目录。站里有步骤计时器：步骤文字里写了“N 分钟”“N 小时”“N 秒”的地方会变成可点的计时按钮。下面这些菜谱的“## 步骤”一节里一个时间数字都没有，所以没有计时按钮。你的任务是给需要等待的步骤补上时间。

要处理的文件：
$FILES

规则（全部照做，不要自行变通，也不要停下来提问）：
- 只修改上面列出的文件，并且只改“## 步骤”一节里的文字。front matter、开头段落、“## 要点”和其他小节一个字都不要动。不新建文件，不 git commit，不运行任何构建命令。
- 只给“需要等待 30 秒以上”的动作补时间：煮、焖、炖、烤、蒸、腌、泡、醒、冷藏、静置、煎到定型这类。切、拌、摆盘、调味这类没有等待的步骤不要动。一道菜里如果确实没有任何需要等待的步骤（例如拌一个油醋汁），就完全不改这个文件，在报告里说明。
- 时间写成阿拉伯数字加“分钟”“小时”或“秒”，范围用“–”连接（如“8–10 分钟”）。保留原来描述的可观察状态，把时间加在它前面或后面，例如把“小火焖到筷子能扎透”改成“小火焖 60–75 分钟，到筷子能扎透”。不要删掉原有的状态描述，不要改写句子的其他部分。
- 时间必须有依据，按这个顺序取：(1) 这篇 front matter 里 sources 列出的来源（有 url 的打开看，是书的按书里的做法）；(2) front matter 的 time.prep 和 time.cook，各步时间加起来不能超过它们；(3) 这道菜公认的常规做法。三者矛盾时以 (1) 为准，并在报告里写出来。找不到依据的步骤不要补，在报告里列出。
- 不要顺手修改用量、错别字或文风，即使你觉得有问题；写在报告里。

完成后用中文报告：每个文件改了哪几步、各补了什么时间、依据是什么；哪些文件没改以及原因；你发现但没有动的问题。"
cd $R
codex --search exec -m gpt-6.1-sol -c model_reasoning_effort='"high"' -s workspace-write -C $R --ephemeral -o $SP/fix/$NAME.md "$PROMPT" < /dev/null > $SP/fix/$NAME.log 2>&1
echo "$NAME exit $? $(date +%H:%M)" >> $SP/fix/done.log
