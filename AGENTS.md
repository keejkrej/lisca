# AGENTS.md

Humans review this file only. Agents maintain **Tech stack** via the memory skill.

## Purpose

- **Product:** LiSCA — analysis software for *live-cell imaging on single-cell arrays* (micropatterned ibidi µ-Slides and similar prepatterned labware).
- **Users:** Cell biologists and pharmacologists running patterned-array timelapse experiments — not general microscopy or single-field-of-view workflows.
- **Problem:** Turn multi-site array acquisitions into registered adhesive sites, annotated ROIs, and quantitative assay readouts across wells and time points.
- **Apps (pipeline):**
  - **Aligner** — register each field to the micropattern grid; mark occupied vs empty sites; preserve site identity across drift and timelapse.
  - **Annotator** — outline cells/regions per site; assign phenotype labels for classification, assisted segmentation, or QC.
  - **Studio** — end-to-end assay workflow (wizard → align → annotate → analyse → charts); built for multi-site arrays, not one FOV.
- **Assays (today):** gene-expression (fluorescence traces, AUC, dose–response plots) and immune-killing (survival scoring, kill-curve kinetics). More assay types follow the same `assay.json` + Rust pipeline pattern.

## Rules

- **`README.md`** — leave blank (title only). Do not put docs here; humans should not rely on them.
- **`docs/agent/`** — on-demand reference for agents (module conventions, pipelines, patterns). Read when working in that area; do not duplicate long content into `AGENTS.md`.

## Tech stack

<!-- memory:techstack-start -->
- **Monorepo:** Bun workspaces + Turborepo — React 19, Vite, Tailwind v4, coss-ui, Effect Atom, TanStack Router; Electron desktop and Expo mobile; Rust HTTP/WS servers per product (`apps/*/server`).
- **Client IO:** Effect programs and shared atoms in `@lisca/client` — not raw `fetch` in components.
- **CLI:** Prefer `bun lisca <dev|build|dist|typecheck|preview|install> <aligner|annotator|studio|landing|workspace> [target]` over raw `turbo` — `scripts/lisca.mjs`.
- **Tooling:** oxfmt + oxlint; React Compiler enabled in web apps via `liscaReactPlugin()` — no `useMemo`, `useCallback`, or `memo`.
- **Imports:** Extensionless TypeScript imports (no `.ts`/`.tsx` suffixes) — `.oxlintrc.json` `import/extensions`.
- **Web UI:** coss (Base UI) primitives in `@lisca/ui/components/ui/` — do not edit vendor files; add via `packages/ui/components.json` (`@coss` registry). Shell/feature boundaries — `docs/agent/ui-package-layout.md`.
- **Contracts:** Never hand-write wire types — derive from Effect Schema + HttpApi in `@lisca/contracts`. Wizard/UI assay types from `@lisca/contracts/assay`, not the root entry. After schema changes: `bun run contracts:generate`; after Rust type changes: `bun --filter @lisca/contracts rust-types`.
- **Backends:** Rust (Axum; serde types from `typify` on generated JSON Schema) for product APIs; Python (uv, Ruff, ty, Typer) in `python/` for utilities and training.
- **Tests:** Put logic in `@lisca/utils`, `@lisca/ui-headless`, `@lisca/client` — not DOM or React Native component mounts — `docs/agent/ui-package-layout.md`.
- **Install policy:** Bun (`bunfig.toml` `minimumReleaseAge`) and Python uv (`exclude-newer = "7 days"`) both reject packages newer than 7 days.
<!-- memory:techstack-end -->

## Context

- Package map and import boundaries: `docs/agent/packages.md`
- Contracts pipeline: `docs/agent/contracts.md`
- UI package layout (headless/platform split, testing): `docs/agent/ui-package-layout.md`
- UI shell/theme: `docs/agent/shell-ui.md`
- Mobile clients (Expo, env, dev ports): `docs/agent/mobile.md`
- Studio analysis charts: `docs/agent/analysis.md`
- Effect Atom patterns: `docs/agent/atoms.md`
