已修改 5 个文件，仅改“## 步骤”，保留全部原有状态描述。未新建文件、提交或运行构建；已核对修改范围和差异格式。

| 文件 | 修改与依据 |
|---|---|
| `orecchiette-con-cime-di-rapa.md` | 第 2 步：rapini 煮 **2 分钟**，依据原列 [La Cucina Italiana 配方](https://www.lacucinaitaliana.it/ricetta/primi/orecchiette-con-le-cime-di-rapa/)；鲜面继续煮约 **5 分钟**，参照 [GialloZafferano 常规做法](https://ricette.giallozafferano.it/Orecchiette-con-le-cime-di-rapa.html)。第 3 步：蒜香油小火加热约 **5 分钟**，参照 [Frantoi 做法](https://www.frantoi.org/orecchiette-con-le-cime-di-rapa/)。合计约 12 分钟，未超过 `cook: 20`。 |
| `pad-pak-boong.md` | 第 4 步：翻炒约 **1 分钟**。原列 Thompson 摘录没有具体时间，采用[泰式炒空心菜常规做法](https://hungryinthailand.com/pad-pak-boong/)，在 `cook: 3` 内。 |
| `pad-see-ew.md` | 第 3 步：鸡肉与芥兰茎约 **2 分钟**；第 4 步：收附汁水约 **1 分钟**；第 5 步：第一面约 **1 分钟**、另一面约 **2 分钟**；第 6 步：芥兰叶约 **2 分钟**。依据《Simple Thai Food》的[授权摘录](https://www.bonappetit.com/recipe/pad-see-ew-recipe)。 |
| `panna-cotta.md` | 第 1 步：明胶泡 **5–10 分钟**，依据[明胶厂商操作指南](https://www.oetker.co.uk/inspiration/tips-and-tricks/t/dr-oetkers-guide-to-gelatine)，未超过 `prep: 15`。第 2 步：加热约 **3–5 分钟**，由原列[教学来源](https://www.lacucinaitaliana.it/tutorial/le-tecniche/scuola-di-cucina-panna-cotta-come-prepararla/)的“小火几分钟”结合 `cook: 5` 具体化。第 5 步：将原有“至少六小时”转为 **至少 6 小时**，与原列[配方](https://www.lacucinaitaliana.it/ricetta/panna-cotta-sciroppo-ciliegie-briciole-torta-tazza/)一致。 |
| `pasta-alla-gricia.md` | 第 2 步：煎猪颊肉约 **10 分钟**，参照 [GialloZafferano](https://www.giallozafferano.com/recipes/pasta-alla-gricia-spaghetti-with-cured-pork-jowl.html)；第 3 步：煮意面约 **9–10 分钟**，参照 [Barilla spaghetti](https://www.barilla.com/en-us/products/pasta/classic-blue-box/spaghetti)。原列学院配方只给状态；补入时间合计不超过 `cook: 20`。 |

未修改的文件：

- `nuoc-cham.md`：调汁没有必须等待的步骤；第 5 步冷藏是提前制作后的保存，不需要人为规定等待时间。[原配方](https://www.epicurious.com/recipes/food/views/basic-dipping-sauce-383006)
- `pesto-alla-genovese.md`：洗、捣、拌和使用酱汁，没有必须等待的步骤。
- `onigiri.md`：未取得可核对的书中具体时间。第 1 步生米煮制依赖米袋或电饭煲程序，`cook: 0` 也无法提供依据；第 3 步散热缺少可靠数字；第 6 步冷藏属于保存。

其他未补时间的等待动作：猫耳朵面第 3 步鳀鱼化散、空心菜第 5 步汤汁沸腾、炒河粉第 1 步软化或煮干粉、奶冻第 4 步散热、格里查面第 5 步停止冒泡。未找到适用于原有操作的可靠具体时间，保留状态判断。

发现但没有修改的问题：

- **炒河粉时间冲突**：按来源两批合计约 **16 分钟**，超过 `cook: 15`。依你的优先级采用来源时间，front matter 未动。
- **奶冻来源冲突**：第一来源要求煮沸后再煮 15 分钟，第二来源要求小火加热几分钟；现有正文采用后者，因此没有把前者的煮沸时间套入原步骤。
- **奶冻已有中文时间**：原文并非完全没有时间；“六小时”只是无法按所需阿拉伯数字格式识别。
- **饭团总时长范围**：`cook: 0` 按熟饭计算，未涵盖步骤中从生米开始的可选做法。