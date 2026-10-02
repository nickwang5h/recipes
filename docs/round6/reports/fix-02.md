已修改七个文件，仅改“## 步骤”，保留全部状态描述。`insalata-caprese.md` 未改。未新建文件、提交或运行构建；新增时间均能被现有计时器识别。

| 文件 | 修改及时间 | 依据 |
|---|---|---|
| `hollandaise.md` | 第 3 步：蛋黄底液打稠，约 **1–2 分钟** | 所列《Mastering the Art of French Cooking》荷兰酱段落中的隔水加热打稠时间。[书籍文本](https://www.scribd.com/document/442187447/Julia-Child-Mastering-the-Art-of-French-Cooking-pdf) |
| `hong-shao-rou.md` | 第 1 步：焯肉 **3–4 分钟**；第 5 步：小火焖约 **45 分钟** | 所列 Andrea Nguyen 配方明确给出这两个时间。[来源](https://asiandumplingtips.com/2009/12/chairman-maos-redcooked-pork-belly-recipe-hong-shao-rou.html) |
| `horenso-no-gomaae.md` | 第 2 步：烘芝麻 **2–3 分钟**；第 4 步：叶片入水后焯约 **45 秒** | 未取得所列原书的具体计时段落，采用常规做法对照：[干烘芝麻](https://www.wandercooks.com/toasted-sesame-seeds/)、[芝麻拌菠菜](https://www.justonecookbook.com/spinach-with-sesame-sauce/)。 |
| `huang-gua-pi-dan-tang.md` | 第 4 步：煎皮蛋与蒜约 **2 分钟** | HowToCook 只给上色状态；采用常规煎制时间，对照[同类皮蛋汤做法](https://post.smzdm.com/p/am8dor8k/)，未超过 `cook: 5`。 |
| `jiang-ban-qiao-mai-mian.md` | 第 3 步：增加“**Hakubaku 荞麦面为 4 分钟**” | 所列厂家沸水煮制说明；仍保留“按包装规定”。[来源](https://hakubaku.com.au/product/soba/) |
| `jie-mo-huang-you-luo-shi-xia.md` | 第 3 步：**每面煎约 2 分钟** | 原列来源未给具体时间；参考带壳大虾煎制的常规做法，作为估计值。[厨师配方](https://www.jamesmartinchef.co.uk/recipes/galton-blackistons-crevettes-a-la-plancha/) |
| `khao-pad.md` | 第 3 步：蒜约 **30 秒**、洋葱两面各 **1 分钟**；第 4 步：**3–4 分钟**；第 6 步：鸡蛋约 **1 分钟**、芥兰叶约 **1 分钟** | 全部来自所列《Simple Thai Food》的授权刊载配方，均为每批时间。[来源](https://www.epicurious.com/recipes/food/views/khao-phat-kai-fried-rice-with-chicken) |

`insalata-caprese.md` 没有必须定时等待的动作；奶酪沥水按原有表面状态判断，因此整个文件保持原样。

缺少明确依据、没有补时间的动作：

- 荷兰酱：温热黄油、准备水浴。
- 红烧肉：放凉、炒糖色、软度不足时续焖、收汁。
- 芝麻拌菠菜：提前准备时的冷藏。
- 黄瓜皮蛋汤：加水烧开、黄瓜入汤后重新沸腾。
- 荞麦面：冲凉、沥水、可选冷藏。
- 罗氏虾：炒蒜及融化黄油、酱汁煮制和两次收浓。
- 泰式炒饭：蒸散多余水分、炒热冷饭。来源没有单独时长，保留原判断。

发现但没有改的问题或来源差异：

- **泰式炒饭总时长**：按原文分两批，已标时动作合计 **15–17 分钟**，尚未计入炒热米饭等动作，会超过 `cook: 15`。按你的规则优先采用来源，front matter 未动。
- **荞麦面来源差异**：HowToCook 写冷水煮 **8–10 分钟**，Hakubaku 写沸水煮 **4 分钟**。本站步骤采用沸水下锅，所以只补对应品牌的数字，不通用于其他包装。[HowToCook 来源](https://github.com/Anduin2017/HowToCook/blob/master/dishes/staple/酱拌荞麦面/酱拌荞麦面.md)
- **荷兰酱配方差异**：Child 书中的打稠时间对应 3 个蛋黄、1 汤匙水；本站采用 Escoffier 的 2 个蛋黄、75 ml 水。因此补的是估计时间，原有带状痕迹终点完整保留，用量未改。[Escoffier 来源](https://www.escoffier.edu/blog/recipes/how-to-make-a-hollandaise/)