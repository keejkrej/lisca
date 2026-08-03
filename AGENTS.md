# AGENTS.md

Humans review this file only. Agents maintain **Tech stack** via the memory skill.

## Purpose

Terse summary. **`PRODUCT.md`** is the full statement of product shape — the Workspace spine, how the shells compose, assay extensibility, and non-goals.

- **Product:** LiSCA — analysis software for _live-cell imaging on single-cell arrays_ (micropatterned ibidi µ-Slides and similar prepatterned labware).
- **Users:** Cell biologists and pharmacologists running patterned-array timelapse experiments — not general microscopy or single-field-of-view workflows.
- **Problem:** Turn multi-site array acquisitions into registered adhesive sites, annotated ROIs, and quantitative assay readouts across wells and time points.
- **Apps (pipeline):**
  - **Aligner** — register each field to the micropattern grid; mark occupied vs empty sites; save `bbox/` / `align/` (light shell — no ROI crop jobs). Intended handoff: align → agent/CLI/notebook for crop + analysis.
  - **Annotator** — outline cells/regions per site; assign phenotype labels for classification, assisted segmentation, or QC.
  - **Studio** — end-to-end for nontechnical users (wizard → align → crop → annotate → analyse → charts). While Studio matures, nontechnical path is Aligner + `../pyama-v2` Jupyter.
- **Usage modes:** see **How people actually use it** in `PRODUCT.md` (agent/CLI vs Studio vs Aligner+pyama notebooks).
- **Assays (today):** gene-expression (fluorescence traces, AUC, dose–response plots) and immune-killing (survival scoring, kill-curve kinetics) — the two listed in `ENABLED_STUDIO_ASSAY_IDS`. Assay ids are a **closed enum**, not an extension point: adding one is a cross-cutting change across `@lisca/contracts`, Rust, and generated artifacts. Unsupported or unregistered ids fail explicitly; none alias to gene-expression. See `PRODUCT.md`.

## Rules

- **`README.md`** — leave blank (title only). Do not put docs here; humans should not rely on them.
- **`docs/`** — organized by domain (`docs/{domain}/`). Agents may write notes and reference material here freely. Read domain docs when working in that area. Keep `AGENTS.md` short — do not duplicate long content here.

## Agent skills

### Issue tracker

Local markdown — PRDs and issues live in `.scratch/<feature-slug>/`; this repo does not use GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unchanged, recorded as a `Status:` line per issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Assay parity (Python → Rust)

Analysis science matures in sibling `lisca-*-assay` Python packages, then is rewritten into `crates/lisca` for Studio. Contract + scientific parity process: `docs/analysis/parity.md`. Agent skill: `/lisca-parity` (`.grok/skills/lisca-parity/`).

## Tech stack

<!-- memory:techstack-start -->

- **Monorepo:** Bun workspaces + Vite+ (`vp run` for task orchestration) — SolidJS, Vite, Tailwind v4, zaidan (shadcn registry for SolidJS/Kobalte), Effect Atom, TanStack Router; Tauri desktop; Rust HTTP/WS servers per product (`apps/*/server`).
- **Client IO:** Effect programs and shared atoms in `@lisca/client` — not raw `fetch` in components.
- **Toolchain:** `vp` (Vite+) is the unified entry point for package management and JS tasks. Use `vp install`, `vp add`, `vp remove`, `vp run`, `vp exec`, etc. Do not invoke `bun`/`npm`/`pnpm`/`yarn` directly for install/add/remove/update/run commands.
- **CLI:** Root scripts in `package.json` cover daily dev: `vp run dev:aligner`, `dev:annotator`, `dev:studio`, `dev:landing` (frontend + backend via `vp run --parallel`); `vp run dist:<product>` (Tauri packaging via `scripts/package-tauri.ts`); `vp run deploy:landing` (Render deploy via `scripts/deploy-landing.ts`); `vp run build` (all packages + web apps). Underneath, per-package tasks go through `vp run --filter <pkg> <task>`.
- **Tooling:** oxfmt + oxlint are driven by `vp` from `vite.config.ts`.
- **Imports:** Extensionless TypeScript imports (no `.ts`/`.tsx` suffixes) — `.oxlintrc.json` `import/extensions`.
- **Web UI:** zaidan (shadcn registry for SolidJS, built on Kobalte) primitives in `@lisca/ui/components/ui/` — do not modify vendor implementation code; add via `packages/ui/components.json` (`@zaidan` registry: `https://zaidan.carere.dev/r/kobalte/{name}.json`). A verified zero-consumer vendor primitive may be removed together with its barrel and theme references. Component styles live in `packages/ui/theme.css` (`z-*` CSS classes). Shell/feature boundaries — `docs/ui/ui-package-layout.md`.
- **Contracts:** Never hand-write wire types — derive from Effect Schema + HttpApi in `@lisca/contracts`. Wizard/UI assay types from `@lisca/contracts/assay`, not the root entry. After schema changes: `vp run contracts:generate`; after Rust type changes: run the contracts package's rust-types script via the task runner (`vp run rust-types --filter @lisca/contracts` when supported, or the package manager's workspace filter as a fallback).
- **Backends:** Rust (Axum; serde types from `typify` on generated JSON Schema) for product APIs; Python (uv, Ruff, ty, Typer) in `python/` for utilities and training.
- **Tests:** Put logic in `@lisca/utils`, `@lisca/ui-headless`, `@lisca/client` — not DOM component mounts — `docs/ui/ui-package-layout.md`.
- **Agent verification:** Playwright for web (Vite apps, Tauri desktop) — start dev servers, reproduce, and verify yourself.
- **Install policy:** `vp install` auto-detects Bun and respects `bunfig.toml` `minimumReleaseAge`. Python uv (`exclude-newer = "7 days"`) rejects packages newer than 7 days.
<!-- memory:techstack-end -->

## Context

- Product shape — spine, composition, non-goals: `PRODUCT.md`
- Domain glossary: `CONTEXT.md`
- Package map and import boundaries: `docs/packages/packages.md`
- Contracts pipeline: `docs/contracts/contracts.md`
- UI package layout (headless/platform split, testing): `docs/ui/ui-package-layout.md`
- UI shell/theme: `docs/ui/shell-ui.md`
- Studio analysis charts: `docs/analysis/analysis.md`
- Assay Python→Rust parity: `docs/analysis/parity.md`
- Effect Atom patterns: `docs/atoms/atoms.md`
