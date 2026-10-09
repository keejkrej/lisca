# Repository Guidelines

## Fleet

PhD work is a multi-repo, multi-machine fleet. Before choosing a machine, cloning, or
moving files, read `~/workspace/phd-notes/standard/README.md`. Status:
`~/workspace/phd-notes/projects/lisca.md`.

## Project Structure & Module Organization

LiSCA is a pnpm/Vite+ and Cargo monorepo. Product applications live under `apps/{aligner,annotator,studio}/`, each split as applicable into SolidJS `web/`, Rust `server/`, Tauri `desktop/`, and demo packages. Shared TypeScript code belongs in `packages/`: contracts and schemas in `contracts`, client I/O in `client`, reusable logic in `utils` and `ui-headless`, and rendered components in `ui`. Rust libraries are in `crates/`; Python utilities, ROI crop (`lisca.services.crop`), and training code are in `python/`. Canonical Jupyter notebooks for Hub/local zip users live under `notebooks/` (independent SemVer; tags `notebooks-v*`). Keep documentation in the relevant `docs/<domain>/` directory, **product**
model artifacts (Smart exclude / Smart segment) in `models/`, and shared brand
assets in `assets/brand/`. Assay-specific weights (transfection pattern U-Net,
killing ResNet) live on Hugging Face / assay sidecars — see `models/README.md`.
Do not add new assay brains under `models/`.

## Build, Test, and Development Commands

Use Node 24+ and pnpm 12+ (both pinned in `.mise.toml` and `package.json`). JavaScript workspace
tasks are plain `pnpm run` scripts; per-app dev/build/test commands still use the Vite+ `vp` CLI
(`vite-plus/core` is the `vite` catalog alias), and repo-wide lint/format go through `vp lint` / `vp fmt`.

- `pnpm install` installs workspace dependencies.
- `pnpm run dev:studio` starts Studio's web and Rust server; replace `studio` with `aligner` or `annotator`.
- `pnpm run build` builds shared packages and all web apps.
- `pnpm run check` runs linting, TypeScript checks, contract validation, Rust checks/Clippy, and workspace tests.
- `pnpm run fmt` formats supported files; `pnpm run fmt:check` verifies formatting without edits.
- `pnpm run dist:studio` packages the Studio desktop installer; replace `studio` with `aligner` or `annotator`.
- A local desktop build or install that does not name a product packages Studio only. Studio includes the Aligner and Annotator flows, so that one package is the development check. Name the product when a different app is the target.
- GitHub Actions (`Checks` workflow) runs `pnpm run fmt:check` and `pnpm run check` on pull requests and `main`. GitHub Copilot reviews every non-draft pull request automatically (repository ruleset). PR Agent (`.github/workflows/pr-agent.yml`, pr-agent v0.46.0) also reviews those pull requests with Ollama Cloud `deepseek-v4.1-flash` once the `OLLAMA_API_KEY` Actions secret is set; describe and improve stay comment commands. Review guidance for both lives in `.github/copilot-instructions.md`. A `v*` tag publishes Studio installers (signed and notarized macOS DMG, unsigned Windows NSIS, Linux deb) to a GitHub Release. Studio installers include the public killing ONNX. The `release-jupyternotebook` workflow (`workflow_dispatch` from `main`, not a tag push) publishes `lisca-notebooks-X.Y.Z.zip` and tags `notebooks-v*` (not desktop installers).
- `cargo test --workspace` runs Rust tests.
- `cd python && uv run pytest` runs the Python suite (crop tests do not need the crop extra).

## Coding Style & Naming Conventions

TypeScript is strict and uses two-space indentation, extensionless imports, kebab-case filenames, and PascalCase component/type names. Keep network access in `@lisca/client`; do not call `fetch` directly from UI components. Prefer framework-independent behavior in `@lisca/utils` or `@lisca/ui-headless`. Follow standard Rust conventions (`snake_case` modules/functions, `PascalCase` types) and format with `cargo fmt`. Python targets 3.11+, uses 88-character lines, and is checked by Ruff and `ty`.

## Testing Guidelines

TypeScript tests use Vitest and are named `*.test.ts` or `*.test.tsx`, usually in a package's `test/` directory. Rust integration tests belong in `crates/<crate>/tests/`; Python tests use `python/tests/test_*.py`. Add focused regression tests with behavior changes. Run the affected package test first, for example `pnpm run --filter @lisca/client test`, then `pnpm run check` before review.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Polish shell chrome and fix canvas theme live updates.` Keep each commit scoped to one coherent change. Pull requests should explain the user-visible outcome, identify affected apps/packages, link the relevant GitHub issue, and report validation performed. Include screenshots for visual UI changes and call out contract, schema, model, or migration impacts explicitly.

Desktop releases follow [`docs/agents/releases.md`](docs/agents/releases.md): GitHub Releases ship Studio only, the Studio desktop manifests must match the immutable `v*` tag, and unrelated private helpers do not receive empty version bumps.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `keejkrej/lisca`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
