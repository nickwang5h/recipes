# recipes.nickwang.xyz

Astro static site: cooking principles and recipes (Chinese, French, Italian, Thai, Vietnamese, Japanese,
Korean), written in Chinese only for now.
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
- Principles: explain *why*; link recipes and other principles with `/principles/<slug>/` paths.
  "用到它的菜" is generated from recipe front matter — do not write it by hand.
- Every principle and recipe needs at least one reliable source. Do not invent personal experience.
- Chinese prose: full-width punctuation and “” quotes; units as `g`, `ml`, `茶匙`, `汤匙`.

## Commands

- `npm run dev` — local dev server
- `npm test` — scaling/rounding tests
- `npm run build` — type check, build, internal link check

Pushing `main` deploys to Netlify.
