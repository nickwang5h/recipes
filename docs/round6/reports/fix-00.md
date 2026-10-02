已修改 7 个文件，只在“## 步骤”中插入时间，保留全部原文和状态描述。`affogato.md` 未改。未新建文件、未提交、未运行构建。

下表标为“估时”的数字，是结合现有 `time.cook` 和常规做法确定的，并非来源逐字给出的时间。

| 文件 | 修改的步骤与时间 | 依据 |
|---|---|---|
| `aglio-olio.md` | 第 1 步煮面约 **8 分钟**；第 2 步蒜油释香约 **5 分钟**；第 5 步加热收汁 **1–2 分钟** | [Barilla](https://www.barilla.com/en-us/products/pasta/classic-blue-box/spaghetti) 标示煮面 9–10 分钟，预留锅中收尾时间；[Laura Vitale](https://www.laurainthekitchen.com/recipes/spaghetti-aglio-e-olio/) 小火蒜油约 5 分钟，[收尾做法](https://www.laurainthekitchen.com/recipes/10-minute-spaghetti-aglio-e-olio/) 1–2 分钟。合计上限 15 分钟。 |
| `bearnaise.md` | 第 1 步收汁约 **3–5 分钟**；第 2 步融黄油约 **2–3 分钟**；第 3 步水浴增稠 **1–2 分钟** | 前两项为 `cook: 15` 内的常规估时；[收汁参照](https://everydayfrenchchef.com/basics/sauces/sauce-bearnaise/) 为约 3 分钟，液量不同故留范围。水浴时间直接取自所列 [Julia Child 书中做法](https://vibc.ca/read/french/JuliaChildMasteringtheArtofFrenchCookingVolume1.pdf)。 |
| `bechamel.md` | 第 1 步温奶约 **3–5 分钟**；第 2 步炒面糊约 **2 分钟**；第 4 步加热增稠约 **2–4 分钟**；第 5 步小火煮匀约 **1 分钟** | 面糊 2 分钟、沸后煮 1 分钟取自上述 Julia Child 书；温奶和增稠为 `cook: 15` 内的估时。合计上限 12 分钟。 |
| `beurre-blanc.md` | 第 1 步收汁约 **3–5 分钟** | 书中以糖浆状态判断，没有分步数字；结合 `cook: 15`，参照 [Saveur 的收汁 3–4 分钟](https://www.saveur.com/article/recipes/beurre-blanc/)，按本站稍大的液量估时。 |
| `bruschetta-al-pomodoro.md` | 第 4 步两面各烤约 **1–2 分钟** | `cook: 5` 内的常规上火烤法；[Jessica Seinfeld](https://jessicaseinfeld.com/recipes/you-bettah-brushcetta) 每面约 2 分钟。未取得 Hazan 原书正文，不冒称书载时间。 |
| `chao-mo.md` | 第 3 步底面定形约 **1 分钟**；第 4 步炒至金黄约 **4–6 分钟** | [HowToCook](https://github.com/Anduin2017/HowToCook/blob/master/dishes/staple/炒馍.md) 仅给状态及全程约 15 分钟；按本站 `prep: 5、cook: 10` 和常规煎炒估时，合计上限 7 分钟。 |
| `chao-nian-gao.md` | 第 1 步煮薄片年糕约 **2–3 分钟**；第 4 步炒葱白约 **3–5 分钟** | [HowToCook](https://github.com/Anduin2017/HowToCook/blob/master/dishes/staple/炒年糕.md) 无分步数字；按 `cook: 20`、薄片年糕及葱油常规做法估时。未套用另一来源的焖蒸时间。 |

未补时间的等待动作及原因：

- `affogato.md`：杯子冷藏、冰淇淋回软、冷冻柜临时等待均无可靠固定时长，`prep: 5` 也不足以反推出各步，因此整篇未改。
- `bearnaise.md`：收汁放凉、黄油静置沉淀、临时保温；`beurre-blanc.md`：临时保温——没有明确时长依据。
- `bruschetta-al-pomodoro.md`：烤箱预热缺少设备与温度信息。
- `chao-mo.md`：剩余蛋液用量不定，无法确定需要超过 30 秒；可选“多炒一会儿”无明确依据。
- `chao-nian-gao.md`：清水暂存取决于何时下锅；炒蛋没有分步时间依据。青菜快炒来源给的是 30 秒，未补；裹匀酱油属于翻拌调味，也未动。

发现但未修改的问题：

- `affogato.md` 的 [Smeg 来源](https://www.smeg.com/it/ricette/caffe-affogato.html) 标准备 20 分钟且含打发奶油，与本站版本不同；[De’Longhi](https://www.delonghi.com/it-it/e/r/affogato-al-caffe) 另有咖啡静置约 1 分钟的动作，本站没有。未新增这些动作。
- `bechamel.md` 的两个来源流程不同：Julia Child 用煮沸牛奶一次加入，[Escoffier 学校](https://www.escoffier.edu/blog/recipes/how-to-make-the-five-mother-sauces/) 用温奶逐渐加入。保留本站原流程。
- `beurre-blanc.md` 的奶油虽然注明“可选”，但未设 `optional: true`，可能影响冰箱匹配。

修改范围、原文保留和时长预算检查均通过；新增计时范围的上限合计均未超过各篇 `time.cook`。