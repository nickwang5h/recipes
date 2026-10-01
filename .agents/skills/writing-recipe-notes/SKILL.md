---
name: writing-recipe-notes
description: Use when writing, drafting, reviewing or revising a recipe, cooking-principle or cuisine page for recipes.nickwang.xyz (src/content/{recipes,principles,cuisines}/zh), or when dispatching another model to draft one.
---

# Writing recipe notes

## Overview

这个站讲**为什么这样做**。每篇都要让读者明白一个机制，并能在厨房里用上。格式错误由构建负责拦截；本 skill 管的是构建拦不住的东西：事实、用量、来源、文风。

字段定义见 `src/content.config.ts`，已有和计划中的条目见 `docs/content-plan.md`。动笔前先读一篇同类范文：原理看 `principles/zh/emulsification.md`，菜谱看 `recipes/zh/beurre-blanc.md`。

## 页面结构

**原理页**，正文约 800–1300 字（不含空白）：

1. `## 是什么`：一两段讲清机制，第一次出现的术语加粗。
2. 两到三个 `##` 小节，讲决定结果的变量（温度、水、比例、时间等）。能用表格对比的就用表格。
3. `## 在各个菜系里`：中餐、法餐、意大利菜各一条；泰国、越南、日本、韩国**只在有招牌技法或菜时**各加一条，没有就不写，不为凑齐硬编。每条举这个菜系**最有代表性的具体技法或菜**（如拔丝、剞花刀、上汤、*monter au beurre*、*mantecatura*、出汁、糖色 *nước màu*），站里有对应菜谱就链接过去。不要只把原理换个说法再讲一遍。
4. 可选：`## 失败了怎么办` 或 `## 过了头`。

**菜谱页**，正文约 600–1000 字：

1. 开头一到两段：这道菜是什么，它靠哪条原理成立（链接原理页）。历史只写一句，传说要标明是"相传"。
2. `## 步骤`：正文里唯一的有序列表，每步一个动作。关键判断写成可观察的状态，例如"收到只剩约 2 汤匙、像糖浆"，不要只写时间。
3. `## 要点`：2–4 条，格式为 `- **症状**：原因（链接原理）。补救或预防。`

**地方菜系页**（`src/content/regions/zh/`，如川菜、粤菜），正文约 900–1400 字：

1. 开头一段：这个地方菜的整体特点和地理、物产背景，一两句即可，不写“历史悠久”“博大精深”之类的套话。
2. 2–4 个 `##` 小节，每节讲一种**招牌技法**（如川菜的干煸、粤菜的白切与浸、鲁菜的爆与吊汤、淮扬菜的刀工与炖）：是什么、为什么这样做能成立（链接原理页）、代表菜。代表菜在站里有菜谱就链接，没有就只写菜名。
3. 可选 `## 在家能试的`：指向站里已有的菜谱，说明家里能做到哪一步、哪一步需要专业灶具。
4. front matter 的 `featured` 只放站里已有、确实属于这个地方的菜谱 slug；不确定归属就不放。

**front matter**：
- `course` 必填：`veg` 素菜、`meat` 荤菜、`seafood` 水产、`soup` 汤粥、`staple` 主食、`breakfast` 早餐、`dessert` 甜品、`sauce` 酱汁、`drink` 饮品。
- `component: true`：做出来是给别的菜用的半成品，而不是端上桌的一道菜（酱汁、高汤、油酥、白米饭、酒酿等）。`course: sauce` 的菜谱一律加上；其他类型里的半成品也要加。菜谱列表和冰箱默认隐藏这些。
- 配料写成 `{ ref: <名录 id>, qty, unit, note }`。`ref` 必须是 `src/data/ingredients.yaml` 里的 id；菜谱里需要更具体的叫法时加 `name`（如 `ref: ginger, name: 姜丝`）；可有可无的配料加 `optional: true`。
- 名录由审稿人统一维护，起草时不要改 `ingredients.yaml`。需要新食材时，把条目写进本批的提案文件（派活时会给出路径），字段与名录相同；菜谱里照常引用这个新 id。
- 食材在加拿大只有亚洲超市（T&T、H Mart 等）才有（`where: asian`）或很难买（`specialty`）时，如果主流超市有合理替代，在 `note` 里写一句，例如“没有就用 Napa cabbage”。
- 用量以这道菜最公认的经典版本为准，并对照至少一个权威配方核对比例。如果参考的是变体（加奶油、加橄榄油、换奶酪），要么换一个经典来源，要么在正文里点明这是变体。
- 只有需要随份量缩放的配料才写 `qty`；"适量"写在 `note` 里。"适量"只用于盐、胡椒、装饰和煮面水这类按口味或看状态加的东西；高汤、香料、奶酪这类决定成败的配料要给出数字。
- 标题或开头限定了地方做法（粤式、罗马、湖南），用量和步骤就必须是那个地方的经典做法；找不到对应的权威来源，就去掉限定词。
- 单位用 `g`、`ml`、`个`、`片`、`瓣`、`根`、`茶匙`、`汤匙`。计数单位就是实际数的东西：香叶写 `qty: 2, unit: 片`，不写 `unit: 个` 再在 note 里解释“每个指 1 片”。
- 换算后取整：克和毫升 ≥10 取整数，从 oz、cup 换算来的取整到 5（142 g 写 140 g），个数取到 0.5，勺取到 0.25。不要留下 `qty: 3.3, unit: 个` 这种无法照做的数。
- 熟度按加拿大卫生部（Health Canada）的中心温度：猪肉和绞肉 71°C，禽肉、蛋类菜和剩菜复热 74°C。鱼看状态（不透明、能轻松分成片），不写 63°C（那是美国 FDA 的数字）。温度写成 `71°C`，不加空格。

## 改编开源菜谱

可以整篇改编的只有公共领域的源：
- **HowToCook**（中餐，The Unlicense）：清单 `docs/howtocook/selection.json`，仓库 https://github.com/Anduin2017/HowToCook 。
- **based.cooking**（各国家常菜，The Unlicense）：清单 `docs/round4/selection.json` 里 `base` 字段给出文件名，仓库 https://github.com/LukeSmithxyz/based.cooking 。网友投稿，质量参差：用它的菜单和步骤骨架，用量必须对照下面的经典书核对，对不上以经典书为准。

Wikibooks Cookbook 是 CC BY-SA，**不要改写或翻译它的文字**；只能像查百科一样核对事实（配料、比例），并且不列为来源。

- **保留**：源里精确的用量、步骤顺序、关键时间。`斤`、`两` 换算成克；`勺` 换算成茶匙或汤匙；`cup`、`oz`、`lb`、`°F` 换算成克、毫升、°C（面粉、糖这类按重量写）。
- **改写**：按本 skill 的结构重写正文：开头讲清这道菜靠什么原理成立，链接 1–3 篇已有原理；`## 步骤` 写成可观察的状态；`## 要点` 写 2–4 条失败原因。
- **删掉**：难度星级、卡路里、“营养均衡”“清热去火”“美容”之类的功效说法、工具清单、PR 邀请、作者闲聊。
- **核对**：源菜谱有明显错误或危险操作（如油温、生食、室温浸泡或发酵过夜）时改正，在交稿报告里说明。源文件里的玩笑话和吐槽（“不放发光玩具”之类）不要带进来。美式改良（加奶油的 Alfredo、加鸡肉的意面）要么改回原产地做法，要么在正文点明是变体。
- **来源**：第一条写源文件，例如 `{ title: "HowToCook：<原菜名>的做法", author: HowToCook 社区, url: https://github.com/Anduin2017/HowToCook/blob/master/<源文件路径> }` 或 `{ title: "based.cooking：<英文标题>", author: <源文件 author 字段>, url: https://github.com/LukeSmithxyz/based.cooking/blob/master/content/<文件名>.md }`，路径里的中文照原样写，不要转义。再加至少一条下面的经典书。

没有可改编的源时，按经典书写，菜单和用量都以书为准。

## 配图

- **原理页**：手写 SVG 示意图，放 `src/assets/diagrams/<slug>.svg`，页面自动内联。宽 600 的 viewBox；`<title>` 写中文图注（会显示在图下），`<desc>` 描述画面；颜色只用 CSS 变量（`--surface`、`--text`、`--muted`、`--primary`、`--accent-*`）以适配深色模式，代表真实颜色的东西（糖色、褐变、油、水）用固定色值。图里的数字只能取自该原理页正文。
- **菜系、地方菜、菜谱**：AI 生成的扁平插画（象牙色底、深灰线条、砖红点缀、无文字、非照片质感），压成 1200 px 宽的 JPEG 放 `src/assets/covers/<集合>/<slug>.jpg`，front matter 写 `cover`（相对路径）和 `coverAlt`（中文描述画面）。页面会自动标注“插图由 AI 生成”。画菜前先读菜谱，按本站做法的成品画，审图时核对主料和盛器。

## 来源

- 每篇 1–3 条来源，挑真正用到的，不要凑数。
- 首选经典书籍：
  - 通用：McGee《On Food and Cooking》（2004）、López-Alt《The Food Lab》（2015）。
  - 中餐：Dunlop《The Food of Sichuan》（2019）、《Revolutionary Chinese Cookbook》（湘菜，2006）、《Land of Fish and Rice》（江南，2016）、《Invitation to a Banquet》（2023）；Grace Young《The Breath of a Wok》（2004）；《中国烹饪百科全书》（1992）。
  - 法餐：Child 等《Mastering the Art of French Cooking》（1961）、Pépin《Jacques Pépin's Complete Techniques》（2001）、Escoffier《Le Guide culinaire》（1903）。
  - 意大利菜：Hazan《Essentials of Classic Italian Cooking》（1992）、Artusi《La scienza in cucina e l'arte di mangiar bene》（1891）、Accademia Italiana della Cucina 登记的传统配方。
  - 泰国菜：Thompson《Thai Food》（2002）、Punyaratabandhu《Simple Thai Food》（2014）。
  - 越南菜：Nguyen《Into the Vietnamese Kitchen》（2006）。
  - 日本料理：Tsuji《Japanese Cooking: A Simple Art》（1980）。
  - 韩国菜：Maangchi《Maangchi's Real Korean Cooking》（2015）。
- 网页或论文只有在**本次真的打开过、并确认内容支持你的说法**时才能用，并写上 `url`。拿不准的就不要写 `url`。只用正式的公开地址，不用 `dev-`、`staging`、`origin.` 这类镜像或测试域名。
- 不确定的书名、章节、页码一律不写。宁可少一条，也不要编一条。
- 正文里引用具体数字（温度、比例）时，要能在所列来源中找到。

## 文风

照着范文写：短句、陈述句、先给结论再讲原因。改稿时对照下表：

| 写成这样 | 改成这样 |
|---|---|
| 这份配方参考 X，调整为两人份 | 删掉。来源列在 front matter 里 |
| 不能当作 A，更不是 B | 只说正确的那一面 |
| 影响大小取决于浓度和配方 | 删掉，或者给出具体数字 |
| 结尾的免责或安全声明段落 | 只在食品安全确实相关时，在 `## 要点` 里写一句 |
| "值得注意的是""需要指出" | 直接说 |
| 一句话里三个以上限定语 | 拆开写，或者删掉 |

- 中文全角标点，引号用 “”。
- 西文菜名第一次出现用斜体或原文，之后用中文名。
- 不编造个人经历，不写"我试过"。

## 链接

- 只链接已经存在、或在本批计划中的 slug，格式为 `/principles/<slug>/`、`/recipes/<slug>/`。
- front matter 里的 `principles`、`related`、`cuisine` 必须指向存在的条目，否则构建失败。
- 原理页"用到它的菜"是自动生成的，不要手写清单。

## 派给其他模型起草

1. 每次派一到五篇，明确写出文件路径、slug、标题、category 或 cuisine、要引用的原理。
2. 要求它先读本 skill 和范文；只新建指定文件；不要 commit，不要改别的文件。
3. 收稿后按下面的审稿清单逐篇过一遍，不要直接发布。

## 审稿清单

逐篇对照：

- [ ] **机制正确**：温度、比例、化学解释和 McGee 一致；有疑问就查，查不到就删掉。
- [ ] **用量合理**：主要比例和经典配方一致，份量与用量对得上。
- [ ] **来源真实**：书名、作者、年份都对；每个 `url` 都打开核实过。
- [ ] **结构达标**：步骤是唯一的有序列表；要点 2–4 条；原理页有"在各个菜系里"，并且每条都是该菜系的招牌例子。
- [ ] **地方做法属实**：标题里的"粤式""罗马"等限定，与来源里的做法一致。
- [ ] **长度达标**：原理 800–1300 字，菜谱 600–1000 字。超出的部分先删限定语和重复内容。
- [ ] **文风**：没有元叙述、免责段落、层层叠加的否定。
- [ ] `npm run build` 通过（会做类型检查、构建和内部链接检查）。
