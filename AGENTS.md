# AGENTS.md

Spec for the **lisca** monorepo: `apps/{aligner,annotator,studio}-{web,server,desktop}`, `packages/@lisca/*`, `crates/lisca`, `python/src/lisca`.

## Stack

| Area             | Tools                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo             | **pnpm** + **Turborepo**                                                                                                                       |
| Web              | **React 19**, **Vite 6**, **TanStack Router**, **TanStack Query**, **Effect**, **Zustand**, **coss-ui**, **Tailwind v4** (`@tailwindcss/vite`) |
| Desktop          | **Electron** (`electron/main.cjs`, preload); dev starts Vite + Rust server                                                                     |
| Realtime         | **WebSocket** on localhost (`/ws`); servers **Rust** / **Tokio** / **Axum**                                                                    |
| New TS HTTP APIs | **Hono**                                                                                                                                       |
| Shared code      | **`lisca`** Rust crate; **`@lisca/contracts`**, **`@lisca/ui`**, **`@lisca/utils`**; Python **`lisca`** (**Hatchling**, `python/`)             |

## Ports

| Product   | Web  | WS   | Server crate       |
| --------- | ---- | ---- | ------------------ |
| Aligner   | 5173 | 8765 | `aligner-server`   |
| Annotator | 5174 | 8766 | `annotator-server` |
| Studio    | 5175 | 8767 | `studio-server`    |

`VITE_WS_PORT` in web `.env.development`; `PORT` overrides the server.

## Commands

`pnpm install` · `pnpm turbo run build` · **`pnpm lint`** (oxlint + `turbo run typecheck`) · **`pnpm format`** (oxfmt) · `pnpm --filter @lisca/<product>-desktop dev` · `cargo build --workspace` / `cargo run -p <crate>` · `cd python && pip install -e ".[dev]"`

## Conventions

Workspace scope **`@lisca/*`**. One root **`Cargo.toml`** workspace. Desktop packages **`devDependencies`** on their web + server so Turbo **`^build`** ordering works. **`pnpm.onlyBuiltDependencies`**: `electron`, `esbuild`. Shared product icons: **`assets/brand/`** (web via Vite `publicDir`; desktop/mobile `assets/` symlinks).
