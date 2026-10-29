# Translating pages into English

The Chinese pages are the source. An English page is a file with the same slug under
`src/content/<collection>/en/`. It holds only the words a reader sees. Quantities, units, ingredient
references, cuisine, course, times, covers, principle links and sources come from the Chinese entry
when the site is built (`src/i18n/content.ts`), so a fix to a number in Chinese reaches both
languages. Schemas: the `*En` collections at the end of `src/content.config.ts`.

A page without an English file simply does not exist on the English site.

## Front matter

Every file has `title`, `summary` and `translated`. `translated` is the Chinese entry's `updated`
date, copied as is; it records which version you translated.

| Collection | Fields |
|---|---|
| recipes | `title`, `original`, `summary`, `coverAlt` (only if the Chinese has a `cover`), `ingredients`, `translated` |
| principles | `title`, `aliases`, `summary`, `translated` |
| cuisines | `title`, `original`, `summary`, `coverAlt` (if the Chinese has a cover), `translated` |
| regions | `title`, `original`, `summary`, `coverAlt` (if the Chinese has a cover), `translated` |

- **title**: recipes take their title from `docs/english/titles.tsv` (slug, title), so link text
  and titles agree across pages. If the recipe shows a listed title is wrong, use a better one and
  say so when you hand the batch back (the table is then corrected in one place). For other pages: the name an English-speaking cook would look for. Use the established English name
  when there is one (Kung Pao Chicken, Mapo Tofu, Beef Bourguignon, Pad Kra Pao). Otherwise describe
  the dish plainly (Stir-fried Tomatoes and Eggs, Cola Chicken Wings). Title case. For French,
  Italian, Vietnamese and other dishes known abroad by their own name, keep that name (Blanquette
  de Veau, Cacio e Pepe, Phở Bò) and put a short English gloss in the summary if needed.
- **original**: for a Chinese dish, the Chinese title exactly as in the source file (`可乐鸡翅`).
  For other cuisines copy the Chinese file's `original` unchanged; leave the field out if it has
  none. For principles there is no `original`.
- **aliases** (principles): other English names a reader might search for, for example
  `[Maillard browning]`. Drop French or other non-English entries unless an English cook really uses
  them. An empty list is fine.
- **summary**: one or two sentences, same meaning as the Chinese.
- **coverAlt**: describe the picture, from the Chinese `coverAlt`.

### Ingredients

`ingredients` mirrors the Chinese list exactly: the same groups in the same order, and in each group
the same number of items in the same order. Each item has:

- **name** (required): how the ingredient reads on this recipe's line, lower case unless it is a
  proper noun (`Shaoxing wine`, `Parmigiano Reggiano`). Start from the catalog English name in
  `src/data/ingredients.yaml` (`en:`), but write what fits the line: `chicken wing flats`, `ginger`,
  `green onion`. When the Chinese item has its own `name` (a cut, a form: 姜丝, 鸡翅中), translate
  that.
- **unit** (optional): only when the default English unit word below reads wrong.
- **note**: only when the Chinese item has a `note`; translate it. Keep numbers and their units as
  they are (`10 g for the marinade, 5 g for braising`).
- **group**: only when the Chinese group has a `group` name; translate it.

The page prints a line as `quantity unit name`. Default unit words, chosen from the Chinese unit:

| Chinese unit | Printed | Example line |
|---|---|---|
| g, ml | g, ml | 6 g ginger |
| 茶匙, 汤匙, 杯 | tsp, tbsp, cup(s) | 1 tbsp light soy sauce |
| 瓣 | clove(s) | 3 cloves garlic |
| 片 | slice(s) | 2 slices ginger |
| 张 | sheet(s) | 4 sheets nori |
| 段, 块 | piece(s) | 1 piece rock sugar |
| 把 | handful(s) | 1 handful cilantro |
| 个, 根, 颗, 只, 枚, 粒, 棵, 条, and no unit | nothing: a bare number | 12 chicken wings |

When the default is wrong, set `unit` to one of: `''` (bare number), `clove`, `slice`, `piece`,
`sheet`, `leaf`, `stalk`, `sprig`, `handful`, `knob`, `can`, `cup`. Write the singular; the page adds
the plural. Examples: two 片 of bay leaf → `{ name: [bay leaf, bay leaves], unit: '' }`; one 块 of
ginger → `{ name: ginger, unit: knob }`.

For a **bare number**, the name must agree with the count, and the count changes when the reader
scales the recipe. So give both forms: `name: [egg, eggs]`, `name: [green onion, green onions]`.
Uncountable things stay a plain string (`name: rice`). With a unit word, the name is a plain string
(`3 cloves garlic`, `2 slices ginger`). Items without a quantity are a plain string too.

Example, for the Chinese
```yaml
ingredients:
  - group: 鸡翅
    items:
      - { ref: chicken-wings, name: 鸡翅中, qty: 12, unit: 个 }
      - { ref: ginger, qty: 6, unit: g, note: 约 2 片，焯水与煎制各一半 }
      - { ref: scallion, qty: 1, unit: 根, note: 挽结 }
      - { ref: water, note: 焯水约需 1000 ml，按锅径补到没过鸡翅 }
```
the English is
```yaml
ingredients:
  - group: Wings
    items:
      - { name: [chicken wing flat, chicken wing flats] }
      - { name: ginger, note: "about 2 slices; half for blanching, half for frying" }
      - { name: [green onion, green onions], note: tied in a knot }
      - { name: water, note: "about 1000 ml for blanching; enough to cover the wings in your pot" }
```

Inside `{ ... }`, quote any value that contains a comma, or YAML ends the value there and silently drops
the rest: `note: "about 2 slices; half for blanching, half for frying"`, `name: ["bone-in, skin-on chicken
thigh", "bone-in, skin-on chicken thighs"]`. Quote a YAML value that contains `: `, `#`, or starts with `[`, `{`, `'`, `"`, `*`, `&`, `!`, `%`
or `@`.

## Body

Translate the whole body; do not summarize, add or drop anything. Keep the Markdown: headings,
bold, italics, lists, tables.

- Fixed headings. Recipes: `## Steps` and `## Key points`, spelled exactly so (the page looks for
  them). Principles: 是什么 → `## What it is`, 在各个菜系里 → `## Across cuisines`,
  失败了怎么办 → `## When it goes wrong`. Regions: 在家能试的 → `## Trying it at home`.
  在加拿大采购 → `## Shopping in Canada`. 延伸阅读 → `## Further reading`. Other headings: translate.
- **No Chinese characters** in the body. Name a dish by its English name, or in italic pinyin or
  romanization when it has none (*wok hei*, *doubanjiang*, *dashi*); its Chinese name is already in
  `original`.
- **Links**: keep every link target exactly as written (`/principles/salt/`, `/recipes/mapo-tofu/`).
  The build points them at the English page when there is one. Translate only the link text; for a
  recipe, use its title from `docs/english/titles.tsv` (or a lower-case form of it in running text).
- **Steps** stay one numbered list, one item per Chinese step.
- **Key points** keep the form `- **Symptom**: cause (with the link). Fix or prevention.`

## Style

The site explains *why* a dish works and lets a cook judge by what they see. Keep that voice.

- Plain, modern English. Short declarative sentences. Conclusion first, then the reason.
- Canadian spelling: flavour, colour, centre, litre, fibre; but -ize (caramelize). Canadian kitchen
  words: green onion (not scallion), cilantro, eggplant, zucchini, bell pepper, cornstarch, all-purpose
  flour, plastic wrap.
- Never invent personal experience. No "I", "we tried", "my grandmother".
- Write observable cues the way the Chinese does ("until the sauce coats a spoon"), not vaguer ones.
- No filler: "it's worth noting", "simply", "delicious", "authentic", "perfect".

### Numbers

- Keep every number exactly. Grams and millilitres stay metric. Spoons: `tsp`, `tbsp`.
- Temperatures: write Celsius first with Fahrenheit in parentheses: `180°C (350°F)`, no space before
  °. Round Fahrenheit to the nearest 5°F, and oven settings to the nearest 25°F
  (160→325, 175/180→350, 190→375, 200→400, 220→425, 230→450, 250→475). Doneness temperatures are
  fixed: `63°C (145°F)`, `71°C (160°F)`, `74°C (165°F)`, `82°C (180°F)`.
- **Durations** must be digits followed by a full unit word, so the page can turn them into timers:
  `30 seconds`, `8 minutes`, `12–15 minutes`, `1.5–2 hours`, `1 hour 20 minutes`. Not "eight
  minutes", "8 mins", "8-minute". Ranges use an en dash (–).
- Lengths in cm, as in the source.

## Words

Use the catalog's English names for ingredients (`src/data/ingredients.yaml`, field `en`), in
lower case in running text. Fixed translations:

| Chinese | English |
|---|---|
| 焯水 | blanch |
| 上浆 | coat with a starch marinade (velvet) |
| 滑油 / 过油 | pass through warm oil |
| 勾芡 / 水淀粉 | thicken with a starch slurry / starch slurry |
| 收汁 | reduce the sauce |
| 爆香 / 炒香 | stir-fry until fragrant |
| 红烧 | red-braise (red-braised) |
| 焖 | braise covered |
| 炖 | stew |
| 干煸 | dry-fry |
| 炝锅 | sizzle aromatics in oil |
| 糖色 | caramel colour |
| 镬气 | wok hei |
| 回锅 | twice-cooked |
| 鱼香 | fish-fragrant |
| 宫保 | kung pao |
| 生抽 / 老抽 | light soy sauce / dark soy sauce |
| 料酒 / 绍兴酒 | Shaoxing wine |
| 香油 | toasted sesame oil |
| 葱 / 葱白 / 葱绿 | green onion / white part / green part |
| 香菜 | cilantro |
| 豆瓣 / 郫县豆瓣 | chili bean paste / Pixian chili bean paste (doubanjiang) |
| 花椒 | Sichuan peppercorns |
| 淀粉 | starch (cornstarch or potato starch, as in the catalog) |
| 高汤 | stock |
| 一锅出 / 能带饭 | one-pot / good for lunch boxes |

Principle titles (use them in link text too):

| slug | English title |
|---|---|
| acid | Acid: Balance, Softening and Stability |
| aromatics | Spices and Aromatics |
| blanching | Blanching and Removing Off-Odours |
| caramelization | Caramelization |
| collagen-gelatin | Collagen and Gelatin |
| emulsification | Emulsification |
| fermentation | Fermented Seasonings |
| gluten | Gluten |
| heat-transfer | Heat Transfer: Conduction, Convection and Radiation |
| knife-work | Knife Work and Cooking |
| maillard-reaction | The Maillard Reaction |
| oil-temperature | Oil Temperature and Deep Frying |
| protein-coagulation | Protein Denaturation and Coagulation |
| salt | Salt: Seasoning, Osmosis and Curing |
| starch-gelatinization | Starch Gelatinization |
| umami | Umami |

Cuisines: Chinese, French, Italian, Japanese, Korean, Thai, Vietnamese. Chinese regional cuisines:
Sichuan, Cantonese, Hunan, Shandong, Jiangsu (Huaiyang), Zhejiang, Fujian, Anhui.

## Checking a batch

`npm run build` fails on a wrong field, a mismatched ingredient list, or a broken link.
`npx vitest run tests/english.test.ts` checks the ingredient mirror and the fixed headings fast.
