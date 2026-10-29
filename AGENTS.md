# recipes.nickwang.xyz

Astro static site: cooking principles and recipes (Chinese, French, Italian, Thai, Vietnamese, Japanese,
Korean), written in Chinese, with an English edition under `/en/`.
Design spec: `docs/superpowers/specs/2026-09-30-recipes-site-design.md`.

## Content

Before writing, reviewing or dispatching another model to draft a page, read
`.agents/skills/writing-recipe-notes/SKILL.md` (content structure, sources, style, review checklist).
Planned and published slugs live in `docs/content-plan.md`.

- Three collections under `src/content/<collection>/zh/`: `cuisines`, `principles`, `recipes`.
  Schemas live in `src/content.config.ts`; a wrong field or reference fails the build.
- File name = slug = public URL. Use English or romanized original names (`mapo-tofu`). Never rename
  a published slug.
- Recipes: ingredients go in front matter as `{ ref: <id>, qty, unit, note }`, where `ref` points at the
  shared catalog `src/data/ingredients.yaml` (Canadian shelf name, where to buy, pantry flag,
  substitutes). Add catalog entries centrally; `qty` only when it should scale. The fridge page
  (`/fridge/`, logic in `src/lib/fridge.ts`) matches on these refs: mark skippable items
  `optional: true`, and keep `substitutes` honest — they count as having the ingredient. The body has
  `## 步骤` as the only ordered list (each item becomes a checkable step) and `## 要点` with
  2–4 failure causes linked to principles.
- Nutrition: `src/data/nutrition.json` is generated in knowledge-compiler (`study.py recipes match|audit|eaten|export
  --to ~/Projects/recipes/src/data`): each catalog ingredient matched to a Canadian Nutrient File food with piece
  weights and densities, and per recipe what is not all eaten and what is served raw. `src/lib/nutrition.ts` sums it
  per serving; `NutritionPanel.astro` shows it with food-safety notes. New ingredients or recipes need a re-run.
- Principles: explain *why*; link recipes and other principles with `/principles/<slug>/` paths.
  "用到它的菜" is generated from recipe front matter — do not write it by hand.
- Every principle and recipe needs at least one reliable source. Do not invent personal experience.
- Chinese prose: full-width punctuation and “” quotes; units as `g`, `ml`, `茶匙`, `汤匙`.

## English edition

- Chinese is the source. `src/content/<collection>/en/<slug>.md` holds only the English words (title, summary,
  ingredient names and notes, body); numbers, units, refs and covers come from the Chinese entry at build time
  (`src/i18n/content.ts`). A page without an English file doesn't exist on the English site.
- How to write or update a translation: `docs/english/translating.md`. Recipe titles: `docs/english/titles.tsv`.
- **When you change a Chinese page, update its English file in the same change** and copy the new `updated`
  date into `translated`; `tests/english.test.ts` fails until you do. A new Chinese recipe needs a new English
  file (and a line in `titles.tsv`).
- Pages live once in `src/pages/[...lang]/` and render both languages; UI strings sit next to their use as
  `{ zh: …, en: … }`. Category labels: `src/lib/categories.ts`. Diagrams: `src/assets/diagrams/en/`.
  Lighter-version prose: `src/data/nutrition-en.json`, keyed like `nutrition.json`'s `lighter`.

## Commands

- `npm run dev` — local dev server
- `npm test` — unit tests, plus `tests/english.test.ts` (English files line up with their Chinese source)
- `npm run build` — type check, build, internal link check, then `scripts/build-sw.mjs` writes `dist/sw.js`
  (from `scripts/sw-template.js`) and `dist/offline-pages.json` for the PWA offline cache

- `node scripts/check-external-links.mjs` — checks every source URL; also runs monthly in
  `.github/workflows/check-links.yml`, which opens an issue when a link is gone

`npm run deploy` builds and uploads to Cloudflare Pages (project `recipes`); `/api/sync` is a Pages Function
in `functions/` backed by the D1 database `recipes` (`migrations/`). Pushing `main` no longer deploys.
