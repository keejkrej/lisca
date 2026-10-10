# Repository Guidelines

## What this repo is

LiSCA is live-cell single-cell analysis for time-lapse microscopy on micropattern arrays. An acquisition (ND2, CZI, or a templated image folder) becomes one workspace: pattern alignment, ROI crops, annotations, and per-cell assay results.

This repository is the product monorepo for Studio, Aligner, and Annotator (SolidJS web, Axum server, Tauri desktop). Studio includes the Aligner and Annotator flows, and GitHub Releases ship Studio. Assay definitions and kernels live in the sibling repositories below. This repo schedules the work, owns the workspace layout, and renders figures.

Human install and run steps are in `README.md`. Domain language is in `CONTEXT.md`. Decisions are in `docs/adr/`.

## Related repositories

Open the sibling that owns the behavior under change. Cite these by GitHub URL.

| When                                                                           | Repository                                                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Transfection segment, traces, AUC, fit, plots, or Python/Rust parity           | [lisca-transfection-assay](https://github.com/keejkrej/lisca-transfection-assay) (Python `transfection`, crate `lisca-transfection`) |
| Death-reporter fluorescence, fluorescent engagement, or the killing classifier | [lisca-killing-assay](https://github.com/keejkrej/lisca-killing-assay) (crate `lisca-killing`)                                       |
| Figure layout, axes, or PNG/SVG/PDF export                                     | [mplot-rs](https://github.com/keejkrej/mplot-rs) (crate `mplot`)                                                                     |
| Zeiss CZI reads                                                                | [czi-rs](https://github.com/keejkrej/czi-rs)                                                                                         |
| Nikon ND2 reads                                                                | [nd2-rs](https://github.com/keejkrej/nd2-rs)                                                                                         |
| Array, signal, image, or classical ML primitives in Rust                       | [mlab-rs](https://github.com/keejkrej/mlab-rs)                                                                                       |

`Cargo.toml` and `python/pyproject.toml` pin `lisca-transfection-assay` and `lisca-killing-assay`. `Cargo.toml` also git-depends on `mplot-rs`, `mlab-rs`, `czi-rs`, and `nd2-rs`. When an assay has both a Cargo pin and a Python pin, keep them on the same commit.

## Install

Node.js 24 and pnpm 12.5.1 (`.mise.toml` and `package.json` `packageManager`), plus stable Rust. Python work uses `uv` and Python 3.11+ from `python/`.

```sh
pnpm install
cd python && uv sync --extra crop
```

`uv sync --extra analysis` installs the transfection package. `uv sync --group train` installs the training stack. Linux Tauri and fontconfig packages are the `apt-get` step in `.github/workflows/checks.yml`.

## Use

```sh
pnpm run dev:studio          # web + server, port 18767
pnpm run dev:aligner         # port 18765
pnpm run dev:annotator       # port 18766
pnpm run dev:studio-desktop
pnpm run dev:studio-demo     # fixture plots, http://localhost:5177
pnpm run dist:studio         # Studio installer
pnpm run fixture:workspace -- --assay transfection --stage cropped --out ./tf-analyze
```

`pnpm run dist:aligner` and `pnpm run dist:annotator` still build those apps. An unnamed desktop package is Studio. Each dev UI proxies its Rust server at the public port plus 1000 (`scripts/lisca-dev-ports.cjs`).

```sh
cargo run -p lisca --bin lisca-analyze -- pipeline WORKSPACE
cargo run -p lisca --bin lisca-analyze -- killing-death-reporter WORKSPACE
cargo run -p lisca --bin lisca-analyze -- killing-engagement WORKSPACE
cargo run -p lisca --bin lisca-crop --no-default-features -- --workspace WORKSPACE --source SOURCE.nd2
cd python && uv run lisca crop --workspace WORKSPACE --source SOURCE.nd2 --positions 0,1,2
```

Transfection stage names match `lisca-transfection`. Killing commands take a workspace path and require `assay.json` type `killing-death-reporter` or `killing-engagement`. Classifier predict, clean, and the kill curve stay in `lisca-killing-assay`; `lisca-analyze` runs the two measurement commands above. Analysis layout: `docs/analysis/analysis.md`.

## Project structure

Product applications live under `apps/{aligner,annotator,studio}/`, each split as applicable into SolidJS `web/`, Rust `server/`, Tauri `desktop/`, and demo packages. Shared TypeScript belongs in `packages/`: contracts and schemas in `contracts`, client I/O in `client`, reusable logic in `utils` and `ui-headless`, and rendered components in `ui`. Rust libraries are in `crates/`. Python utilities, ROI crop (`lisca.services.crop`), and training code are in `python/`. Canonical Jupyter notebooks for Hub and zip users live under `notebooks/` (independent SemVer; tags `notebooks-v*`). Keep documentation in the matching `docs/<domain>/` directory. Product model artifacts (Smart exclude, Smart segment) belong in `models/`. Shared brand assets belong in `assets/brand/`. Assay weights belong on Hugging Face or in the assay repository. See `models/README.md`.

Wire types are Effect Schemas in `packages/contracts`. After a schema change, regenerate with `pnpm --filter @lisca/contracts generate` and run `cargo test -p lisca`.

## Build, test, and development commands

JavaScript workspace tasks are plain `pnpm run` scripts. Per-app dev, build, and test commands use the Vite+ `vp` CLI (`vite-plus/core` is the `vite` catalog alias). Repo-wide lint and format go through `vp lint` and `vp fmt`.

- `pnpm run build` builds shared packages and all web apps.
- `pnpm run check` runs lint, TypeScript, contract validation, Rust check and Clippy, and workspace tests.
- `pnpm run fmt` formats supported files. `pnpm run fmt:check` verifies formatting.
- GitHub Actions `Checks` runs `pnpm run fmt:check` and `pnpm run check` on pull requests and `main`. Copilot reviews every non-draft pull request (repository ruleset). PR Agent (`.github/workflows/pr-agent.yml`) reviews with Ollama Cloud `deepseek-v4.1-flash` once the `OLLAMA_API_KEY` Actions secret is set. Review guidance is in `.github/copilot-instructions.md`.
- A `v*` tag publishes Studio installers to a GitHub Release. The manual `Desktop build` workflow uploads an Actions artifact and stops there. The `release-jupyternotebook` workflow publishes `lisca-notebooks-X.Y.Z.zip` and tags `notebooks-v*`. Procedure: `docs/agents/releases.md`.
- `cargo test --workspace` runs Rust tests.
- `cd python && uv run pytest` runs the Python suite.

## Coding style

TypeScript is strict, with two-space indentation, extensionless imports, kebab-case filenames, and PascalCase components and types. Network access stays in `@lisca/client`. Framework-independent behavior belongs in `@lisca/utils` or `@lisca/ui-headless`. Rust uses `snake_case` modules and functions, `PascalCase` types, and `cargo fmt`. Python targets 3.11+, 88-character lines, and is checked by Ruff and `ty`.

## Testing

TypeScript tests use Vitest and are named `*.test.ts` or `*.test.tsx`, usually in a package `test/` directory. Rust integration tests belong in `crates/<crate>/tests/`. Python tests use `python/tests/test_*.py`. Add a focused regression test with a behavior change. Run the affected package first, for example `pnpm run --filter @lisca/client test`, then `pnpm run check` before review.

## Commits and pull requests

Recent commits use short imperative summaries such as `Polish shell chrome and fix canvas theme live updates.` Keep each commit to one coherent change. Pull requests explain the user-visible outcome, name the affected apps and packages, link the GitHub issue, and report the validation you ran. Include screenshots for visual UI changes. Call out contract, schema, model, or migration impacts.

## Agent skills

### Issue tracker

Issues and specs are GitHub issues in `keejkrej/lisca`. See `docs/agents/issue-tracker.md`.

### Triage labels

`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

One root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
