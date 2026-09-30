# recipes.nickwang.xyz — 设计文档

日期：2026-09-30
状态：待审阅

## 1. 目标

在 `recipes.nickwang.xyz` 建一个独立的菜谱与烹饪原理笔记站，覆盖经典中餐、法餐、意大利菜。

- **读者**：既给自己在厨房里用，也给别人当公开参考。原理页要讲透，菜谱页要在手机上方便操作。
- **语言**：只写中文。结构上预留 i18n，以后可以加 `/en/` 等语言，不改现有 URL。
- **与主站的关系**：兄弟站。视觉上沿用 `nickwang.xyz` 的基调，但代码、仓库、部署都独立。本次不修改主站仓库 `~/my-website`。

### 成功标准

1. `https://recipes.nickwang.xyz/` 可以访问，HTTPS 有效。
2. 三类页面（菜系、原理、菜谱）和两个索引页都能正常渲染，互相链接正确；原理页自动列出"用到它的菜"。
3. 菜谱页在手机上支持份量缩放、配料和步骤勾选（刷新后保留）、屏幕常亮开关。
4. 首批 9 篇内容上线，每篇都附参考来源。
5. 新增一篇内容只需要写一个 Markdown 文件，字段写错时构建直接失败。

## 2. 技术选型

- **Astro**（当前稳定版），使用 content collections 和 zod schema。
- **独立仓库** `~/Projects/recipes`，对应一个新的 GitHub 仓库。
- **托管**：Netlify（新站点）。**DNS**：Cloudflare（`nickwang.xyz` 已托管在这里）。
- **交互**：只有一个客户端 island `RecipeKit`，用原生 TypeScript 写，不引入 UI 框架。
- **测试**：Vitest，只测纯函数。

以下方案考虑过但没有采用：
- 独立仓库 + Docusaurus：schema 校验和反向索引都要自己写插件，页面也要背整套 React 运行时。
- 放进 `my-website` 做第二个站点：会和主站的 locale、知识库流程、部署规则耦合。

## 3. 内容模型

三个 collection，文件都放在各自的 `zh/` 子目录下：

```
src/content/cuisines/zh/{chinese,french,italian}.md
src/content/principles/zh/<slug>.md
src/content/recipes/zh/<slug>.md
```

条目 ID 等于文件名（slug），用英文或原文罗马化，一旦发布就不再改。以后加其他语言时，同一个 slug 放在 `en/` 等目录下即可。

### 3.1 cuisines

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 如"法餐" |
| `original` | string? | 如"Cuisine française" |
| `summary` | string | 一句话，用于首页卡片 |
| `accent` | `"red" \| "blue" \| "green"` | 标识色 |
| `principles` | ref(principles)[] | 核心原理 |
| `featured` | ref(recipes)[] | 代表菜 |
| `order` | number | 首页排序 |

正文写这个菜系的核心逻辑。比如法餐讲母酱体系、fond、beurre monté；意餐讲煮面水、mantecatura、以食材为中心；中餐讲锅气、勾芡、复合调味、刀工与火候。

### 3.2 principles

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 如"乳化" |
| `aliases` | string[] | 如 `["Emulsification"]` |
| `category` | enum | `heat`（传热）· `reactions`（化学反应）· `colloids`（乳化与胶体）· `starch-protein`（淀粉与蛋白质）· `seasoning`（调味体系）· `prep`（处理与刀工） |
| `summary` | string | 一句话 |
| `related` | ref(principles)[] | 相关原理，可以为空 |
| `sources` | source[] | 至少 1 条 |
| `updated` | date | |

"用到它的菜"不写在 front matter 里，由构建时反查 `recipes.principles` 生成。

### 3.3 recipes

| 字段 | 类型 | 说明 |
|---|---|---|
| `title` | string | 中文名 |
| `original` | string? | 原文名 |
| `cuisine` | ref(cuisines) | |
| `summary` | string | 一句话 |
| `servings` | int > 0 | 基准份量 |
| `time` | `{ prep: int, cook: int }` | 单位：分钟 |
| `principles` | ref(principles)[] | 可以为空 |
| `ingredients` | group[] | 见下 |
| `sources` | source[] | 至少 1 条 |
| `updated` | date | |

```ts
group      = { group?: string, items: ingredient[] }
ingredient = { name: string, qty?: number > 0, unit?: string, note?: string }
source     = { title: string, author?: string, url?: string (URL) }
```

- 有 `qty` 的配料会参与缩放；没有 `qty` 的（如"盐 适量"）原样显示。
- 正文包含 `## 步骤`（有序列表）和 `## 要点`（常见失败原因、替代做法）。步骤文字里的用量**不缩放**，页面会有提示说明。

引用字段（`cuisine`、`principles`、`related`、`featured`）用 Astro 的 `reference()`，指向不存在的条目时构建直接失败。

## 4. 路由

| 路由 | 页面 |
|---|---|
| `/` | 首页：简介、三个菜系入口、最近更新（按 `updated` 取前 6 条）、按分类列出的原理索引 |
| `/cuisines/<slug>/` | 菜系页：正文、核心原理卡片、代表菜 |
| `/principles/` | 原理索引，按 `category` 分组 |
| `/principles/<slug>/` | 原理页：正文、相关原理、"用到它的菜"（按菜系分组）、来源 |
| `/recipes/` | 菜谱索引，可以按菜系筛选（`?cuisine=french`，用少量内联 JS 过滤，没有 JS 时显示全部） |
| `/recipes/<slug>/` | 菜谱页 |
| `/404` | 404 页 |

i18n：在 Astro 的 `i18n` 配置里设 `defaultLocale: "zh"`、`prefixDefaultLocale: false`。本次只生成 `zh` 的页面。链接统一通过一个 `url()` 辅助函数生成，以后加语言时不用逐处改链接。

## 5. 菜谱页与 RecipeKit

布局：
- 页头：标题、原文名、菜系标签、准备和烹饪时间、原理胶囊（链接）。
- 桌面端（≥ 900px）双栏：左栏是配料（`position: sticky`），右栏是步骤。手机单栏，配料在前。
- 页尾：要点、来源。

`RecipeKit` 在配料区和步骤区上做渐进增强：
- **份量缩放**：`[−] n [+]`，n 在 1–24 之间。只改带 `data-qty` 的配料数量，缩放和取整由 `src/lib/scale.ts` 负责。
- **勾选**：配料行和步骤 `<li>` 都能点击勾选。状态存在 `localStorage`，key 是 `recipes:v1:<slug>`，内容为 `{ servings, ingredients: [...], steps: [...] }`。所有读写都包在 try/catch 里，出错时退回到无状态。另有一个"重置"按钮。
- **屏幕常亮**：用 `navigator.wakeLock` 做开关，页面重新可见时自动重新申请；浏览器不支持就不显示这个开关。
- **没有 JS 时**：页面显示基准份量和普通列表，内容完整可读。

### 取整规则（`scale.ts`）

`scaleQty(qty, from, to, unit) → number`，展示时按单位取整：
- `g`、`ml`：结果 ≥ 10 时取整数，< 10 时保留 1 位小数。
- `个`、`颗`、`瓣`、`根`、`片` 等计数单位，以及没有单位的情况：按 0.5 取整，最小为 0.5。
- 其他单位（`茶匙`、`汤匙`、`杯`、`kg`、`L` 等）：保留最多 2 位有效小数，去掉末尾的 0。
- 输出用 `Intl.NumberFormat('zh-CN')` 格式化。

## 6. 视觉

- **颜色 token**：从主站 `src/css/custom.css` 移植。
  - 亮色：底 `#f3f0e8`，表面 `#e9e5dc`，主色 `#b83e30`。
  - 暗色：底 `#11120f`，表面 `#191a16`，主色 `#ff6855`。
  - 菜系色：中餐 red（`#c3473a` / `#ff6f61`），法餐 blue（`#2f6fca` / `#73a7ff`），意餐 green（`#2f8359` / `#67c58e`）。
- **主题**：默认跟随 `prefers-color-scheme`，可以手动切换，选择保存在 `localStorage`。页面在 `<head>` 里用内联脚本提前设置主题，避免闪烁。
- **字体**：标题用霞鹜文楷，正文用思源黑体，从 `~/my-website/src/fonts/` **复制**子集化好的 woff2（只复制，不修改主站），用 `font-display: swap`。数字用 `tabular-nums`。
- **排版**：正文最大宽度约 68ch；手机两侧 16px 边距，不允许横向滚动。勾选行的触控区至少 44px。
- **动效**：只保留 hover 和勾选时的过渡（≤ 150ms），尊重 `prefers-reduced-motion`。
- **打印**：`@media print` 隐藏交互控件，改为单栏。
- **页脚**：链接回 `https://nickwang.xyz`。

## 7. 仓库结构

```
astro.config.mjs
netlify.toml
package.json
src/
  content.config.ts
  content/{cuisines,principles,recipes}/zh/
  components/  (RecipeKit.astro + recipe-kit.ts, Tag, Card, ThemeToggle, …)
  layouts/Base.astro
  lib/  (scale.ts, url.ts, backlinks.ts)
  pages/
  styles/  (tokens.css, global.css)
public/fonts/
tests/scale.test.ts
AGENTS.md    # 简短写作约定：字段含义、来源要求、slug 规则
```

## 8. 部署

1. 创建 GitHub 仓库 `recipes`（私有还是公开，到时候再问你），推送 `main` 分支。
2. 安装 Netlify CLI（**已获授权**），新建站点并关联仓库，构建命令 `npm run build`，发布目录 `dist`，Node 版本与本地保持一致。
3. 在 Netlify 上添加自定义域名 `recipes.nickwang.xyz`。
4. 在 Cloudflare 添加 `CNAME recipes → <site>.netlify.app`，设为 DNS only。这一步需要你在 Cloudflare 控制台操作，或者提供 API token。
5. 等 Netlify 签发证书后，确认 HTTPS 页面正常。

第 1、2、3、4 步都是对外操作，每一步执行前都要再次确认。已获授权的只有"安装 CLI"这一项。

## 9. 首批内容（由 Claude 起草）

| 类型 | 条目 |
|---|---|
| 菜系 | 中餐 `chinese`、法餐 `french`、意餐 `italian` |
| 原理 | 乳化 `emulsification`、美拉德反应 `maillard-reaction`、淀粉糊化 `starch-gelatinization` |
| 菜谱 | 麻婆豆腐 `mapo-tofu`、黄油白酱 `beurre-blanc`、黑胡椒奶酪意面 `cacio-e-pepe` |

写作要求：
- 以原理为主线，讲清"为什么"。
- 来源用可靠出处，如 Harold McGee《On Food and Cooking》、Serious Eats、Fuchsia Dunlop、*Larousse Gastronomique*、Marcella Hazan 等，在首次实质引用处标注。
- 不编造个人经验。
- 每篇菜谱的 `## 要点` 写 2–4 条常见失败原因及对应的原理解释。

## 10. 测试与验收

- `npm test`：用 Vitest 测 `scale.ts`，覆盖各单位的取整、最小值 0.5、无 `qty` 条目、1↔24 份的边界。
- `npm run build`：schema 和引用校验通过，生成全部页面。
- 在浏览器里检查 375px 和 1280px 两个宽度，亮色和暗色两种主题：
  - 首页、菜系页、原理页（反向链接正确）、菜谱索引的筛选。
  - 菜谱页：缩放、勾选、刷新后状态保留、重置。
  - 没有横向滚动。
- 部署后：确认 `https://recipes.nickwang.xyz/` 能访问，证书有效。

## 11. 不在本次范围

搜索（以后可以加 Pagefind）、中文以外的语言、评论和账号、单位换算和计时器、图片与图床、主站导航里的"菜谱"入口。
