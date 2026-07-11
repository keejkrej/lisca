# AGENTS.md

Humans review this file only. Agents maintain **Tech stack** via the memory skill.

## Purpose

- **Product:** LiSCA — analysis software for _live-cell imaging on single-cell arrays_ (micropatterned ibidi µ-Slides and similar prepatterned labware).
- **Users:** Cell biologists and pharmacologists running patterned-array timelapse experiments — not general microscopy or single-field-of-view workflows.
- **Problem:** Turn multi-site array acquisitions into registered adhesive sites, annotated ROIs, and quantitative assay readouts across wells and time points.
- **Apps (pipeline):**
  - **Aligner** — register each field to the micropattern grid; mark occupied vs empty sites; preserve site identity across drift and timelapse.
  - **Annotator** — outline cells/regions per site; assign phenotype labels for classification, assisted segmentation, or QC.
  - **Studio** — end-to-end assay workflow (wizard → align → annotate → analyse → charts); built for multi-site arrays, not one FOV.
- **Assays (today):** gene-expression (fluorescence traces, AUC, dose–response plots) and immune-killing (survival scoring, kill-curve kinetics). More assay types follow the same `assay.json` + Rust pipeline pattern.

## Rules

- **`README.md`** — leave blank (title only). Do not put docs here; humans should not rely on them.
- **`docs/agents/`** — on-demand reference for agents (module conventions, pipelines, patterns). Read when working in that area; do not duplicate long content into `AGENTS.md`.

## Tech stack

<!-- memory:techstack-start -->

- **Monorepo:** Bun workspaces + Vite+ (`vp run` for task orchestration) — SolidJS, Vite, Tailwind v4, zaidan (shadcn registry for SolidJS/Kobalte), Effect Atom, TanStack Router; Tauri desktop and Expo mobile; Rust HTTP/WS servers per product (`apps/*/server`).
- **Client IO:** Effect programs and shared atoms in `@lisca/client` — not raw `fetch` in components.
- **Toolchain:** `vp` (Vite+) is the unified entry point for package management and JS tasks. Use `vp install`, `vp add`, `vp remove`, `vp run`, `vp exec`, etc. Do not invoke `bun`/`npm`/`pnpm`/`yarn` directly for install/add/remove/update/run commands.
- **CLI:** Root scripts in `package.json` cover daily dev: `vp run dev:aligner`, `dev:annotator`, `dev:studio`, `dev:landing` (frontend + backend via `vp run --parallel`); `vp run dist:<product>` (Tauri packaging via `scripts/package-tauri.ts`); `vp run deploy:landing` (Render deploy via `scripts/deploy-landing.ts`); `vp run build` (all packages + web apps). Underneath, per-package tasks go through `vp run --filter <pkg> <task>`.
- **Tooling:** oxfmt + oxlint are driven by `vp` from `vite.config.ts`.
- **Imports:** Extensionless TypeScript imports (no `.ts`/`.tsx` suffixes) — `.oxlintrc.json` `import/extensions`.
- **Web UI:** zaidan (shadcn registry for SolidJS, built on Kobalte) primitives in `@lisca/ui/components/ui/` — do not edit vendor files; add via `packages/ui/components.json` (`@zaidan` registry: `https://zaidan.carere.dev/r/kobalte/{name}.json`). Component styles in `packages/ui/theme.css` (`z-*` CSS classes). Shell/feature boundaries — `docs/agents/ui-package-layout.md`.
- **Contracts:** Never hand-write wire types — derive from Effect Schema + HttpApi in `@lisca/contracts`. Wizard/UI assay types from `@lisca/contracts/assay`, not the root entry. After schema changes: `vp run contracts:generate`; after Rust type changes: run the contracts package's rust-types script via the task runner (`vp run rust-types --filter @lisca/contracts` when supported, or the package manager's workspace filter as a fallback).
- **Backends:** Rust (Axum; serde types from `typify` on generated JSON Schema) for product APIs; Python (uv, Ruff, ty, Typer) in `python/` for utilities and training.
- **Tests:** Put logic in `@lisca/utils`, `@lisca/ui-headless`, `@lisca/client` — not DOM or React Native component mounts — `docs/agents/ui-package-layout.md`.
- **Agent verification:** Playwright for web (Vite apps, Expo web-native, Tauri desktop); pymobiledevice3 for physical iOS — start dev servers, reproduce, and verify yourself; `docs/agents/mobile.md` for ports.
- **Install policy:** `vp install` auto-detects Bun and respects `bunfig.toml` `minimumReleaseAge`. Python uv (`exclude-newer = "7 days"`) rejects packages newer than 7 days.
<!-- memory:techstack-end -->

## Context

- Package map and import boundaries: `docs/agents/packages.md`
- Contracts pipeline: `docs/agents/contracts.md`
- UI package layout (headless/platform split, testing): `docs/agents/ui-package-layout.md`
- UI shell/theme: `docs/agents/shell-ui.md`
- Mobile clients (Expo, env, dev ports): `docs/agents/mobile.md`
- Studio analysis charts: `docs/agents/analysis.md`
- Effect Atom patterns: `docs/agents/atoms.md`
