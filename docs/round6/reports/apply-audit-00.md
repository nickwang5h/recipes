已修改 3 个菜谱文件。工作区的 `audit-00.md` 只有完成说明，本次依据 Git 当前版本保存的完整核对表处理，未改动核对文件。

| 文件 | 改动（旧值 → 新值） |
|---|---|
| [katsudon.md](/Users/congwang/Projects/recipes/src/content/recipes/zh/katsudon.md) | 步骤 6 蛋层煮制：约 2–3 分钟 → 约 1 分钟；保留状态描述 |
| [tempura.md](/Users/congwang/Projects/recipes/src/content/recipes/zh/tempura.md) | 虾：8 个 → 4 个；扑粉面粉：20 g → 15 g；步骤 5 茄子炸制：1–2 分钟 → 1 分钟，保留状态描述 |
| [saba-no-misoni.md](/Users/congwang/Projects/recipes/src/content/recipes/zh/saba-no-misoni.md) | `servings`：2 → 4；按 B 类处理，配料不动 |

已打开来源复核：[猪排丼](https://www.justonecookbook.com/katsudon/)、[天妇罗](https://www.justonecookbook.com/tempura-recipe/)、[味噌煮青花鱼](https://www.justonecookbook.com/saba-misoni-simmered-mackerel-in-miso-sauce/)。上述数字与核对表一致；扑粉面粉按表中换算的 15.625 g 取整为 15 g。

跳过项如下：

| 文件 | 未处理条目及原因 |
|---|---|
| 全部 8 篇 | 清单中的所有 `time.prep`、`time.cook` 差异：明确排除 |
| tempura.md | 杏鲍菇：名录没有对应 id；莲藕、日式红薯、紫苏叶：属于新增缺失配料，不属于 A–D 四类 |
| yakitori.md | 七味唐辛子：来源可选、未定量 |
| buta-no-shogayaki.md | 面粉：有条件的可选配料；黑胡椒：来源可选、未定量 |
| saba-no-misoni.md | 青花鱼、水、清酒、味醂、糖、味噌、酱油的折半建议：已按 B 类修正份数，不再折算配料；木の芽：可选装饰 |
| sake-no-shioyaki.md | 酱油、柚子汁：属于另一个蘸汁分支，且本稿为缺项，不是 D 类“适量”；南天：装饰；青花鱼：另一鱼种变体；清酒、姜汁：可选腌法 |
| kinpira-gobo.md | 出汁：仅用于粗牛蒡丝的可选加料 |
| agedashi-dofu.md | 七味唐辛子：来源可选、未定量 |

核对表全文标为“来源没写，本稿是估计”的时间均保留；没有符合 D 类的条目。天妇罗虾的“约 200 g”注记也保留，未自行推算来源没有给出的重量。

已检查最终差异；未新建文件、未改食材目录、未 commit、未运行构建。