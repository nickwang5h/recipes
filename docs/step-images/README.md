# 步骤配图

每道菜的每一步配一张插画，Codex 的出图工具画，风格与封面一致。682 道菜，共 4379 步（2026-11-05）。

## 画什么（依据）

| 做法 | 依据 |
|---|---|
| 一张图只画一个动作；步骤里有几件事，挑文字强调的、最容易做错的那件 | 说明性分镜的通行规则：两个动作挤在一格，读者会以为是同时做的（[安全培训分镜指南](https://www.thepromptindex.com/skill/750-storyboard-safety-instructional)） |
| 画出这一步用到的材料，以及文字写的“做到什么样”（变褐、出油、浓稠） | 过程图的价值在关键转变和读者要对照的视觉信号，不在每个动作（[Publishers Weekly：分步骤食谱书](https://www.publishersweekly.com/pw/by-topic/industry-news/cooking/article/44157-cookbooks-take-readers-step-by-step-with-tons-of-pictures.html)；[mergeimages 过程图指南](https://mergeimages.net/blog/cooking-recipe-step-by-step-photo-grid)） |
| 做菜人的视角，只画手；同一道菜各步视角、锅具不变 | Cook's Illustrated 一系的《Knife Skills Illustrated》用操作者自己的视角，正好看出手放在哪（[hertzmann.com/knife](https://www.hertzmann.com/knife/pages/index.php)） |
| 不提前画成品，只有装盘那步画成品；一道菜在一次会话里画完，附封面图作参照 | 文生图做步骤图的两个典型毛病：每步都画成最终成品（goal overshadowing），各张分开生成导致颜色和器具前后不一致（[Generating Illustrated Instructions, CVPR 2024](https://arxiv.org/abs/2312.04552)） |
| 火苗大小表示火力，砖红箭头表示推、翻、卷的方向，不出现任何文字和数字 | 时间和分量文字里已有；文字一进图就容易画错，也没法翻译 |

提示词全文：[style.md](style.md)。每步的材料取自 `src/data/cook-links.json`，Codex 还会自己读菜谱全文。

## 流程

```
queue.txt 排序 → 查 Codex 额度 → codex exec（一道菜一次，附封面）→ .step-images/raw/<slug>/NN.png
    → 960×640 WebP → public/steps/<slug>/NN.webp，替代文字和步骤文字的哈希 → src/data/step-images.json
```

```sh
node scripts/step-images.mjs status                 # 进度
node scripts/step-images.mjs run --wait             # 一直画下去，5 小时额度到 85% 就睡到重置
node scripts/step-images.mjs run --limit 5          # 只画 5 道
node scripts/step-images.mjs draw mapo-tofu         # 指定某道
node scripts/step-images.mjs stale                  # 改过文字、图已过期的步骤
touch .step-images/STOP                             # 让正在跑的 run 画完当前这道就停
```

## 断点续跑

- 进度就是文件本身：一步算画好，当且仅当 `public/steps/<slug>/NN.webp` 存在，且 `step-images.json` 里记的哈希等于这一步现在的文字。随时中断（Ctrl-C、额度耗尽、断网、关机），再跑 `run` 就从第一个缺图的步骤接着画，已经画好的不会重画。
- Codex 中途停下时，已经画出的 PNG 下次先装上，只补缺的那几步，提示里附上全部步骤供它对照前后。
- 一道菜两次都没画全就跳过（记在 `.step-images/state.json`），`status` 会列出来；删掉 state 里那一条就会重试。
- 每道菜开画前建锁目录 `.step-images/locks/<slug>`，所以可以同时开两个 `run`，互不重复。被强杀留下的锁要手动删。
- 改了某步的文字，那一步的哈希就对不上，下次 `run` 会只重画这一步。要整道菜重画，把 slug 写进 `redo.txt`。
- 额度：每道菜开画前查一次 Codex 用量。5 小时窗口超过 `--max-5h`（默认 85%）就停下或睡到重置，周窗口超过 `--max-week`（默认 90%）就停，留一点额度给别的活。

## 额度与速度（2026-11-05 试画 5 道实测）

- gpt-6.1-terra 画一道菜（5–7 张）约 3–4 分钟，两个 `run` 并行没有互相拖慢。
- 一道菜约占 Codex Plus 5 小时窗口的 1%、周窗口的 0.25%，周窗口是瓶颈：一周约 350 道，全部 682 道需要两周额度，或者用掉一张重置券。
- WebP 平均约 33 KB 一张，全部画完约 145 MB。

## 审图

每画完一批，拼成每道菜一张的总览图人工过目，重点看：食材画错（豆腐画成鸡蛋）、提前画成品、图里出现文字、同一道菜前后锅具不一致。不合格的整道写进 `redo.txt`，或者删掉单张的 webp 和 json 记录后重跑。

## 页面

`public/steps/` 下的图原样发布，不经 Astro 的图片管线，一步一个文件：Cloudflare Pages 免费版一个站点上限 20,000 个文件，现有约 9,100 个，加上 4379 张还剩余量。页面在构建时把图插到每一步下面（rehype 插件读 `step-images.json`，网址带哈希，重画后不会读到旧缓存），做菜模式随步骤一起显示。
