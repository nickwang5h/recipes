已修改 5 篇菜谱。front matter、食材引用、取整和 diff 检查通过；未新建文件、修改食材名录、提交或运行构建。

多来源条目保留已符合 A 的现有口径；棒棒鸡采用现有煮鸡分支 B，B 未列的芝麻酱、蒜和姜泥按 A 折算。

| 文件 | 修改（旧值 → 新值） |
|---|---|
| [dan-dan-mian.md](/Users/congwang/Projects/recipes/src/content/recipes/zh/dan-dan-mian.md) | 细干面：200 → 150 g；糖：0.25 → 0.75 茶匙 |
| [suan-la-fen.md](/Users/congwang/Projects/recipes/src/content/recipes/zh/suan-la-fen.md) | 葱：1 → 2 根 |
| [fu-qi-fei-pian.md](/Users/congwang/Projects/recipes/src/content/recipes/zh/fu-qi-fei-pian.md) | 拌汁盐：“适量”→ `qty: 0.25, unit: 茶匙`，删除“适量” |
| [suan-ni-bai-rou.md](/Users/congwang/Projects/recipes/src/content/recipes/zh/suan-ni-bai-rou.md) | servings：4 → 2；配料全部保留 |
| [bang-bang-ji.md](/Users/congwang/Projects/recipes/src/content/recipes/zh/bang-bang-ji.md) | 煮鸡姜：5 → 7.5 片；葱：2 → 3 根；黄瓜：0.5 → 1 根；生抽、汁内红油：各 2 → 3 汤匙；芝麻酱：1 → 1.5 汤匙；香醋：0.75 → 1.5 汤匙；糖：2 → 0.5 茶匙；蒜：1 → 1.5 瓣；姜泥：1 → 1.5 茶匙；花椒面：0.25 → 0.5 茶匙；汁内盐：“适量”→ 0.25 茶匙；煮鸡汤：2 → 3 汤匙。步骤 2、4 的鸡汤和步骤 4 的芝麻酱同步修改 |

黄瓜的折算值 0.75 根取整为 1 根；棒棒鸡糖、花椒面的 0.375 茶匙取整为 0.5 茶匙；汁内盐的 0.1875 茶匙取整为 0.25 茶匙。

以下清单条目未修改：

- **时间字段差异**：八篇清单中的所有 `time.prep`、`time.cook` 均跳过。
- **可选、装饰或另一分支**：担担面 B 自制红油的整花椒、桂皮、八角、油、辣椒碎及制油时温；夫妻肺片、蒜泥白肉的可选沙姜；棒棒鸡 A 蒸鸡用盐、熟芝麻装饰、可选另淋红油及蒸鸡时温。
- **不属于 A–D 四类的完全缺项**：港式奶茶甜炼乳；冻柠茶青柠；担担面甜面酱／海鲜酱、老抽、肉臊及碗底五香粉；酸辣粉花生油、五香粉、香油；棒棒鸡香油。这些是“未列出”，不是已有配料写成“适量”。
- **现有值符合所采用来源**：港式奶茶淡奶 160 ml、每杯 80 ml及煮茶 15 分钟保留 A；担担面猪肉、芽菜、炒肉油、绍兴酒、芝麻酱、蒜、碗底生抽、花椒粉、红油保留 A；酸辣粉香醋、生抽、花椒面、蒜、榨菜保留 A；棒棒鸡鸡胸 350 g保留核对表认可的 B 口径。
- **按 B 类只改份数**：蒜泥白肉的五花肉、料酒、整花椒、黄瓜、蒜泥、汁中姜葱、香醋、香油、取用复制酱油和肉汤均未加倍。
- **取整后与现值相同**：夫妻肺片、蒜泥白肉的丁香和草果，来源折算为 0.25 个，按 0.5 个取整后仍为现有 0.5 个。
- **来源未给的估计时间**：原样保留，包括棒棒鸡不足熟度时追加煮 2 分钟；未套用另一蒸鸡分支的追加时间。没有条目因食材名录缺少 id 而跳过。

另复核发现：核对表称棒棒鸡 B 没有两块鸡胸的具体时间，但[来源正文](https://redhousespice.com/bang-bang-chicken/)明确给出煮 **12 分钟、浸 5 分钟**。现稿正是两块鸡胸，因此保留这两个时间及 74°C，没有改成单块示例的 8＋3 分钟。

`gang-shi-nai-cha.md`、`dong-ning-cha.md`、`hong-you-chao-shou.md` 未发生修改。