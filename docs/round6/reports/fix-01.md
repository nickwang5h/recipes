已修改 4 个文件，全部只新增“## 步骤”中的时间，原有状态描述完整保留。未新建文件、提交或运行构建；差异检查通过。

| 文件 | 补充时间 | 依据 |
|---|---|---|
| `egg-fried-rice.md` | 第 1 步：静置至少 **15 分钟**；第 3 步：蛋液定型约 **30 秒**；第 5 步：炒热米饭约 **2–3 分钟** | front matter 中的 [Serious Eats 配方](https://www.seriouseats.com/perfect-egg-fried-rice)，采用家用炉灶时间 |
| `fan-sha-yu-tou.md` | 第 3 步：炸芋条约 **8–10 分钟** | 原来源没有分步时间，参考[常规反沙芋头做法](https://m.xiachufang.com/recipe/1007131/)，未超过 `cook: 15` |
| `fettuccine-al-burro.md` | 第 2 步：新鲜宽面通常约 **2–4 分钟**，保留“按包装时间煮” | [Rana 美国版](https://www.giovanniranausa.com/products/fettuccine.html)标注 2 分钟，[意大利版](https://shop.giovannirana.it/prodotto/fettuccine-confezione-da-250-g)标注 4 分钟；未超过 `cook: 10` |
| `goi-cuon.md` | 第 1 步：煮虾约 **90–150 秒**；第 3 步：米线约 **3–5 分钟**；第 4 步：酱持续冒泡约 **1 分钟**、勾芡约 **30 秒** | 煮虾参考 [Hungry Huy](https://www.hungryhuy.com/how-to-make-goi-cuon-vietnamese-spring-rolls/)；米线和蘸酱分别依据原列的[春卷节选](https://www.epicurious.com/recipes/food/views/southern-salad-rolls-382895)、[蘸酱节选](https://www.epicurious.com/recipes/food/views/spicy-hoisin-garlic-sauce-383010) |

以下文件未改：

| 文件 | 原因 |
|---|---|
| `chao-tang-se.md` | [原来源](https://github.com/Anduin2017/HowToCook/blob/master/dishes/condiment/简易版炒糖色.md)只有颜色、气泡判断，没有溶糖、蒸发水分或重新溶糖的分步时间；`cook: 10` 不能确定各阶段时长。 |
| `dan-jian-ci-ba.md` | [原来源](https://github.com/Anduin2017/HowToCook/blob/master/dishes/breakfast/蛋煎糍粑.md)只给全程约 10 分钟，没有首次定型、续煎的具体时间；糍粑厚度也未明确，未强行拆分。 |
| `dou-chi-ling-yu-you-mai-cai.md` | 原来源没有分步时间；[另一来源](https://thewoksoflife.com/fried-dace-stir-fried-greens/)的 30 秒用于加盖烹调，与原文敞锅翻炒不同，不能直接套用。 |
| `french-omelette.md` | [Pépin 的经典法式做法](https://www.pbs.org/wnet/americanmasters/learn-jacques-pepins-famous-omelette-techniques/8589/)没有可核实的独立等待时间；其中“煎 1 分钟上色”属于乡村蛋卷，不适用于本文。 |

发现但没有改的问题及未补时间的动作：

- **蛋炒饭准备时间矛盾**：来源要求新饭至少摊凉 15 分钟，超过 `prep: 5`。按你的优先级采用来源，front matter 保持原样。
- **春卷煮肉方法与来源不同**：来源是离火盖锅焖泡 20 分钟，原文是微沸煮至 71°C，不能直接套用，猪肉时间未补。虾同样存在煮制与离火浸熟的差别，因此采用对应煮制方法的常规时间。
- **春卷分类**：`course: veg`，但含虾、猪肉和鸡肝，未修改。
- 芋头第 4 步熬糖；宽面第 1 步黄油放软、碗预热；各处烧水、解冻、沥水和放凉，均缺少足以对应现有条件的具体时长，未补。
- 未能核实所列书籍原文中的具体时长，没有将书名当作数字依据。