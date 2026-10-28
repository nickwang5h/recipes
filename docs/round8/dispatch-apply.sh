#!/bin/zsh
# usage: dispatch.sh <round dir name> <audit file basename without .md>
SP=/private/tmp/claude-501/-Users-congwang-Projects-design-atlas/9ea6e0f3-bcb2-44ad-bcef-5d5a7e615389/scratchpad
R=/Users/congwang/Projects/recipes
RD=$1; A=$2; NAME=apply-$A
mkdir -p $SP/apply
[ -s $SP/apply/$NAME.md ] && exit 0
PROMPT="这是一个中文菜谱站（Astro），仓库在当前目录。docs/$RD/audit/$A.md 是一份数字核对表：它把几篇新菜谱的用量和时间逐项对照了各自引用的来源网页，文件开头的“需要处理的差异”列出了对不上的条目。你的任务是按这份清单修改对应的菜谱文件。

先读 docs/$RD/audit/$A.md 全文、.agents/skills/writing-recipe-notes/SKILL.md 的“页面结构”一节里关于 front matter 和用量取整的规则，以及 src/data/ingredients.yaml。

要处理的四类条目（只处理这四类）：
A. 配料用量“不一致”：把本稿用量改成来源按份数折算后的数，按站内规则取整（克和毫升 ≥10 取整到 5，勺取到 0.25，个数取到 0.5）。步骤和正文里写到同一个数字的地方同步改。
B. 份数口径不一致（核对表指出配料其实是来源整批的量，而 servings 写小了或写大了）：只改 servings 为来源的份数，配料不动。同一篇不要既改 servings 又按折算改配料。
C. 步骤里的时间或温度“不一致”：改成来源的数字，原句里可观察的状态描述保留。
D. 来源给了具体数字、而本稿写成“适量”的盐、胡椒等调味料：补上 qty 和 unit，去掉“适量”。

不要处理的条目（原样跳过，写进报告）：
- time.prep、time.cook 的差异；
- 来源标为可选、装饰、或属于另一个分支或变体的配料（“若列出……则补列”这类）；
- 需要新增一个 ingredients.yaml 里没有的食材 id 才能补的配料；
- 核对表自己写了“来源没写，本稿是估计”的时间；
- 拿来对照的来源其实是另一道菜（例如土豆烧鸡对照红烧鸡、大盘鸡），只是借用了技法或调味：这种差异不按来源改；
- 同一项有两个来源、数字差很多（“A 或 B”）时，按这道菜主要依据的那个来源改；分不出主次就不改。

规则：
- 只修改“需要处理的差异”里出现的菜谱文件，不新建文件，不改 ingredients.yaml，不 git commit，不运行构建。
- 不改文风，不重写句子，不调整核对表没提到的任何数字。
- 份数只有 2 或 4：配料明显是来源 4 人份的整批量、而 servings 写了 2 时，优先按 B 把 servings 改成 4，而不是把每样配料减半。
- 核对表的说法你拿不准时（例如折算比例看起来算错了），打开来源网页自己核一次，以来源为准，并在报告里写明。

完成后用中文报告：每个文件改了哪几处（旧值 → 新值）；清单里哪些条目没处理、属于上面哪一类。"
cd $R
codex --search exec -m gpt-6.1-terra -c model_reasoning_effort='"high"' -s workspace-write -C $R --ephemeral -o $SP/apply/$NAME.md "$PROMPT" < /dev/null > $SP/apply/$NAME.log 2>&1
echo "$NAME exit $? $(date +%H:%M)" >> $SP/apply/done.log
