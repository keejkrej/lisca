# Lisca

pnpm + [Turborepo](https://turbo.build/) monorepo for Aligner, Annotator, and Studio. Each product ships as a **React (Vite)** web app, an **Axum WebSocket** server, and an **Electron** shell that starts the server and loads the dev server (or a packaged URL later).

## Layout

| Path | Role |
|------|------|
| `apps/*-web` | Vite + React + Tailwind CSS v4 |
| `apps/*-server` | Rust binary (`cargo`), shared logic in `crates/lisca` |
| `apps/*-desktop` | Electron main/preload; dev runs Vite + spawns server |
| `packages/contracts`, `ui`, `utils` | Scoped npm packages `@lisca/*` |
| `crates/lisca` | Shared Rust library (protocol + `run_ws_server`) |
| `python/` | Installable **`lisca`** Python package (Hatchling, `src/lisca`) |

Default ports: Aligner web `5173` / WS `8765`, Annotator `5174` / `8766`, Studio `5175` / `8767`. Override the server with `PORT`.

## Commands

```bash
pnpm install
pnpm turbo run build
pnpm turbo run lint
```

Run a full desktop dev stack (Vite + `cargo run` for the matching server + Electron):

```bash
pnpm --filter @lisca/aligner-desktop dev
```

Run pieces individually:

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

- **pnpm** `onlyBuiltDependencies` includes `electron` so its postinstall can run without interactive approval.
- **Cargo.lock** is tracked for reproducible Rust builds.
- After cloning, run `pnpm install` once so Turborepo can order `@lisca/*` package builds before app `tsc` runs.
