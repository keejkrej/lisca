# Lisca

pnpm + [Turborepo](https://turbo.build/) monorepo for Aligner, Annotator, and Studio. Each product ships as a **React (Vite)** web app, an **Axum WebSocket** server, and a **Tauri** shell that owns the webview and runs the WS server in process.

## Layout

| Path                                | Role                                                            |
| ----------------------------------- | --------------------------------------------------------------- |
| `apps/*-web`                        | Vite + React + Tailwind CSS v4                                  |
| `apps/*-server`                     | Rust binary (`cargo`), shared logic in `crates/lisca`           |
| `apps/*-desktop`                    | Tauri shell (`src-tauri`) and app assets                        |
| `packages/contracts`, `ui`, `utils` | Scoped npm packages `@lisca/*`                                  |
| `crates/lisca`                      | Shared Rust library (protocol + `run_ws_server`)                |
| `python/`                           | Installable **`lisca`** Python package (Hatchling, `src/lisca`) |

Default ports: Aligner web `5173` / WS `8765`, Annotator `5174` / `8766`, Studio `5175` / `8767`. Override the server with `PORT`.

## Commands

```bash
pnpm install
pnpm turbo run build
pnpm lint
pnpm format
```

Run a full desktop dev stack (Tauri + in-process WS server):

```bash
pnpm --filter @lisca/aligner-desktop dev
```

Run web pieces individually:

```bash
pnpm --filter @lisca/aligner-web dev
pnpm --filter @lisca/aligner-server dev
```

Rust from repo root:

```bash
cargo build --workspace
cargo run -p aligner-server
```

Python package (editable):

```bash
cd python
pip install -e ".[dev]"
```

## Tooling notes

- **pnpm** `onlyBuiltDependencies` currently includes `esbuild`.
- **Cargo.lock** is tracked for reproducible Rust builds.
- After cloning, run `pnpm install` once so Turborepo can order `@lisca/*` package builds before app `tsc` runs.
