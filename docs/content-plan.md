# 内容清单

slug 一旦发布就不改。✅ = 已发布。

## 原理

| slug | 标题 | category | 状态 |
|---|---|---|---|
| emulsification | 乳化 | colloids | ✅ |
| maillard-reaction | 美拉德反应 | reactions | ✅ |
| starch-gelatinization | 淀粉糊化 | starch-protein | ✅ |
| heat-transfer | 传热：传导、对流与辐射 | heat | ✅ |
| oil-temperature | 油温与油炸 | heat | ✅ |
| caramelization | 焦糖化 | reactions | ✅ |
| protein-coagulation | 蛋白质变性与凝固 | starch-protein | ✅ |
| collagen-gelatin | 胶原与明胶 | starch-protein | ✅ |
| gluten | 面筋 | starch-protein | ✅ |
| salt | 盐：调味、渗透与腌制 | seasoning | ✅ |
| acid | 酸：平衡、软化与稳定 | seasoning | ✅ |
| umami | 鲜味 | seasoning | ✅ |
| knife-work | 刀工与受热 | prep | ✅ |

## 菜谱

| slug | 标题 | 菜系 | 主要原理 | 状态 |
|---|---|---|---|---|
| mapo-tofu | 麻婆豆腐 | chinese | starch-gelatinization, maillard-reaction | ✅ |
| beurre-blanc | 黄油白酱 | french | emulsification | ✅ |
| cacio-e-pepe | 黑胡椒奶酪意面 | italian | emulsification, starch-gelatinization | ✅ |
| tomato-egg | 番茄炒蛋 | chinese | protein-coagulation, salt | ✅ |
| kung-pao-chicken | 宫保鸡丁 | chinese | starch-gelatinization, oil-temperature, knife-work | ✅ |
| hong-shao-rou | 红烧肉 | chinese | caramelization, collagen-gelatin | ✅ |
| steamed-fish | 清蒸鱼 | chinese | heat-transfer, protein-coagulation | ✅ |
| egg-fried-rice | 蛋炒饭 | chinese | starch-gelatinization, oil-temperature | ✅ |
| french-onion-soup | 法式洋葱汤 | french | maillard-reaction, caramelization | ✅ |
| boeuf-bourguignon | 勃艮第红酒炖牛肉 | french | collagen-gelatin, maillard-reaction | ✅ |
| french-omelette | 法式蛋卷 | french | protein-coagulation, heat-transfer | ✅ |
| hollandaise | 荷兰酱 | french | emulsification, protein-coagulation | ✅ |
| bechamel | 贝夏美酱 | french | starch-gelatinization | ✅ |
| carbonara | 罗马蛋黄培根意面 | italian | protein-coagulation, emulsification | ✅ |
| risotto-alla-milanese | 米兰烩饭 | italian | starch-gelatinization | ✅ |
| ragu-alla-bolognese | 博洛尼亚肉酱 | italian | maillard-reaction, collagen-gelatin | ✅ |
| aglio-olio | 蒜油辣椒意面 | italian | emulsification, starch-gelatinization | ✅ |
| fresh-egg-pasta | 手工鸡蛋面 | italian | gluten, protein-coagulation | ✅ |

## 第三批：HowToCook 改编

清单见 `docs/howtocook/selection.json`（251 道中式家常菜，已全部改编并审稿）。配料通过 `ref` 引用 `src/data/ingredients.yaml` 食材名录，为以后按现有食材匹配菜谱预留。新增原理：

| slug | 标题 | category | 状态 |
|---|---|---|---|
| blanching | 焯水与去腥 | prep | ✅ |
| fermentation | 发酵调味料 | reactions | ✅ |
| aromatics | 香料与香气提取 | seasoning | ✅ |
