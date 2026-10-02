已修改 7 个文件，只补“## 步骤”中的时间；原有文字和状态判断均保留，其他小节未变。没有新建文件、提交或运行构建，差异检查通过。

| 文件 | 修改步骤与时间 | 依据 |
|---|---|---|
| `pi-dan-shou-rou-zhou.md` | 第 4 步：肉丝煮约 **3 分钟**；第 5 步：皮蛋热透约 **30 秒** | front matter 所列 [Made With Lau](https://www.madewithlau.com/recipes/century-egg-and-pork-congee)；仍保留肉熟透、71°C 和生菜变软的判断 |
| `ri-ben-dou-fu.md` | 第 1 步：木耳泡约 **20 分钟**；第 4 步：第一面 **2–3 分钟**，翻面后约 **2 分钟**；第 5 步：配菜炒 **3–4 分钟** | 所列 HowToCook 未给具体时间；采用常规做法：[木耳泡发](https://www.souschef.co.uk/blogs/the-bureau-of-taste/fresh-spicy-wood-ear-fungus-salad)、[玉子豆腐煎制](https://garlicdelight.com/pan-fried-egg-tofu/)、[豆腐配菜翻炒](https://spicedivas.blogspot.com/2015/04/easy-stir-fry-with-egg-tofu.html) |
| `risotto-alla-milanese.md` | 第 1 步：洋葱约 **5 分钟**；第 2 步：炒米 **3–4 分钟**；第 4 步：加汤阶段 **11–13 分钟**；第 5 步：加入藏红花后约 **5 分钟** | 所列 [GialloZafferano](https://ricette.giallozafferano.it/Risotto-alla-milanese.html)明确炒米 3–4 分钟、加汤后总共 16–18 分钟、最后 5 分钟加藏红花；洋葱采用[常规烩饭做法](https://www.jamieoliver.com/recipes/rice/three-cheese-risotto/) |
| `salade-nicoise.md` | 第 1 步：鸡蛋水沸后约 **8 分钟** | 所列[尼斯旅游局传统配方](https://www.explorenicecotedazur.com/explorer/art-de-vivre/gastronomie-et-terroir/recettes-de-cuisine-nicoise/la-salade-nicoise/)标注烹饪 8 分钟，鸡蛋是唯一需烹饪的食材 |
| `salsa-verde.md` | 第 2 步：盐渍酸豆浸洗约 **5 分钟** | 常规脱盐做法：[Mariquita Farm 收录的 Chez Panisse 配方](https://mariquita.com/recipes/parsley.html)明确浸泡 5 分钟；切碎、拌酱未动 |
| `saltimbocca-alla-romana.md` | 第 4 步：肉面煎约 **2 分钟** | 所列 Artusi 未给数字；采用 [In Rome Cooking](https://www.inromecooking.com/uploads/2022/02/Saltimbocca-alla-Romana.pdf)的常规煎制时间。火腿面原有“十几秒”未动 |
| `sheng-cuan-wan-zi-tang.md` | 第 1 步：粉丝泡约 **15 分钟**；第 4 步：粉丝煮约 **3–4 分钟**；第 6 步：丸子浮起后约 **1 分钟** | 前两项取自所列 [The Woks of Life](https://thewoksoflife.com/chinese-winter-melon-soup-meatballs/)；最后一项取自所列 [HowToCook](https://github.com/Anduin2017/HowToCook/blob/master/dishes/soup/生汆丸子汤.md) |

`pi-dan-dou-fu.md` 完全未改：即食豆腐版本只有切、摆、调汁；条件性的加热和剩余食材冷藏依包装执行，无法补统一时间。

以下等待动作没有补：

- 瘦肉粥第 1、3 步：来源没有电饭锅具体程序时长，`cook: 80` 不能直接当作程序时间。
- 烩饭第 3 步：酒液收尽的独立时长未找到可靠依据。
- 丸子汤第 1 步：木耳、黄花菜泡发及香料水浸泡；第 4 步：木耳、黄花菜煮软；第 5 步：丸子初步定形。未找到能直接对应现有水温、大小和操作的可靠时长。
- 沙拉第 1 步冷水降温，以及各篇预热、冷藏候用：未补固定倒计时。

发现但未动的问题：日本豆腐的泡发等待已占满 `prep: 20`，分批过多也可能超过 `cook: 15`；烩饭步骤引用“浸泡的汤”，却没有明确泡藏红花的操作。书籍原文未取得，下厨房来源也未成功读出，因此没有把其中未核实的数字作为依据。本次新增时间未出现来源要求必须突破 front matter 上限的情况。