# Repository Guidelines

## Fleet

PhD work is a multi-repo, multi-machine fleet. Before choosing a machine, cloning, or
moving files, read `~/workspace/phd-notes/standard/README.md`. Status:
`~/workspace/phd-notes/projects/lisca.md`.

## Project Structure & Module Organization

LiSCA is a pnpm/Vite+ and Cargo monorepo. Product applications live under `apps/{aligner,annotator,studio}/`, each split as applicable into SolidJS `web/`, Rust `server/`, Tauri `desktop/`, and demo packages. Shared TypeScript code belongs in `packages/`: contracts and schemas in `contracts`, client I/O in `client`, reusable logic in `utils` and `ui-headless`, and rendered components in `ui`. Rust libraries are in `crates/`; Python utilities and training code are in `python/`. Keep documentation in the relevant `docs/<domain>/` directory, **product**
model artifacts (Smart exclude / Smart segment) in `models/`, and shared brand
assets in `assets/brand/`. Assay-specific weights (transfection pattern U-Net,
killing ResNet) live on Hugging Face / assay sidecars — see `models/README.md`.
Do not add new assay brains under `models/`.

## Build, Test, and Development Commands

Use Node 22+, pnpm 10+, and the `vp` wrapper for JavaScript workspace tasks.

- `vp install` installs workspace dependencies.
- `vp run dev:studio` starts Studio's web and Rust server; replace `studio` with `aligner` or `annotator`.
- `vp run build` builds shared packages and all web apps.
- `vp run check` runs linting, TypeScript checks, contract validation, Rust checks/Clippy, and workspace tests.
- `vp run fmt` formats supported files; `vp run fmt:check` verifies formatting without edits.
- `vp run dist:studio` packages the Studio desktop installer; replace `studio` with `aligner` or `annotator`.
- GitHub Actions runs `vp run fmt:check` and `vp run check` on pull requests and `main`. A `v*` tag publishes unsigned Studio, Aligner, and Annotator installers (macOS DMG, Windows NSIS, Linux deb) to a GitHub Release. Studio installers include the public killing ONNX.
- `cargo test --workspace` runs Rust tests.
- `cd python && uv run pytest` runs the Python suite.

## Coding Style & Naming Conventions

TypeScript is strict and uses two-space indentation, extensionless imports, kebab-case filenames, and PascalCase component/type names. Keep network access in `@lisca/client`; do not call `fetch` directly from UI components. Prefer framework-independent behavior in `@lisca/utils` or `@lisca/ui-headless`. Follow standard Rust conventions (`snake_case` modules/functions, `PascalCase` types) and format with `cargo fmt`. Python targets 3.11+, uses 88-character lines, and is checked by Ruff and `ty`.

## Testing Guidelines

TypeScript tests use Vitest and are named `*.test.ts` or `*.test.tsx`, usually in a package's `test/` directory. Rust integration tests belong in `crates/<crate>/tests/`; Python tests use `python/tests/test_*.py`. Add focused regression tests with behavior changes. Run the affected package test first, for example `vp run --filter @lisca/client test`, then `vp run check` before review.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `Polish shell chrome and fix canvas theme live updates.` Keep each commit scoped to one coherent change. Pull requests should explain the user-visible outcome, identify affected apps/packages, link the relevant local issue or PRD under `.scratch/<feature-slug>/`, and report validation performed. Include screenshots for visual UI changes and call out contract, schema, model, or migration impacts explicitly.

Desktop releases follow [`docs/agents/releases.md`](docs/agents/releases.md): the three shipped apps share one release version, release-bearing desktop manifests must match the immutable `v*` tag, and unrelated private helpers do not receive empty version bumps.
