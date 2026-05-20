# AGENTS.md

Spec for the **lisca** monorepo: `apps/{aligner,annotator,studio}-{web,server,desktop}`, `packages/@lisca/*`, `crates/lisca`, `python/src/lisca`.

## Stack

| Area             | Tools                                                                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo             | **pnpm** + **Turborepo**                                                                                                                                                                                                        |
| Web              | **React 19**, **Vite 6**, **TanStack Router**, **TanStack Query**, **Effect**, **Zustand**, **coss-ui**, **Tailwind v4** (`@tailwindcss/vite`)                                                                                  |
| Desktop          | **Electron** (`electron/main.cjs`, preload); dev starts Vite + Rust server                                                                                                                                                      |
| Realtime         | **WebSocket** on localhost (`/ws`); servers **Rust** / **Tokio** / **Axum**                                                                                                                                                     |
| New TS HTTP APIs | **Hono**                                                                                                                                                                                                                        |
| Shared code      | **`lisca`** Rust crate; **`@lisca/contracts`** (Specta wire types + Effect Schema), **`@lisca/client`** (port interfaces + HTTP/WS clients), **`@lisca/ui`**, **`@lisca/utils`**; Python **`lisca`** (**Hatchling**, `python/`) |
| Contracts        | `pnpm contracts:generate` — Rust `protocol.rs` → `packages/contracts/src/protocol.generated.ts`; runtime decode via Effect Schema in `protocol.schema.ts`                                                                       |

## Dependency pinning

| Ecosystem | Source of truth | Consume as |
| --------- | --------------- | ---------- |
| TypeScript | `pnpm-workspace.yaml` `catalog` | `"name": "catalog:"` |
| TypeScript (transitive) | `pnpm.overrides` for `effect`, `react` | — |
| Rust | `Cargo.toml` `[workspace.dependencies]` | `dep.workspace = true` |
| Python | `python/pyproject.toml` `[tool.uv] constraint-dependencies` | listed in `[dependency-groups]` |

**Rule of thumb:** catalog / workspace / constraint for shared and version-sensitive deps; inline semver for app-specific leaves (Expo, Electron, one-off libs).

New Rust crates must add shared deps to `[workspace.dependencies]` and reference `dep.workspace = true` in member `Cargo.toml` files — never duplicate versions inline.

## Effect (v3)

- **`effect`** is pinned via **pnpm catalog** (`pnpm-workspace.yaml`); depend with `"effect": "catalog:"`.
- **Imports:** subpaths (`effect/Schema`, `effect/Either`, …), not the `effect` barrel.
- **Wire JSON:** use `@lisca/contracts` helpers — `schemaDecoder` / `schemaDecoderEither` (hoisted), `decodeJson`, `readJsonResponse`, `formatSchemaError`.
- **Web state:** Zustand + TanStack Query unchanged; `Effect.tryPromise` only in `apps/*-web/src/effects/*` loaders.

## Packages

- **`@lisca/contracts`** — Specta-generated wire types, Effect schemas, decode helpers. No port interfaces or HTTP/WS client logic.
- **`@lisca/client`** — `*DataPort` / `*HostPort` interfaces and implementations (`create*Port`, `subscribeProgress`). Subpath exports only (e.g. `@lisca/client/ports/types`); no root barrel.

## Ports

| Product   | Web  | WS   | Server crate       |
| --------- | ---- | ---- | ------------------ |
| Aligner   | 5173 | 8765 | `aligner-server`   |
| Annotator | 5174 | 8766 | `annotator-server` |
| Studio    | 5175 | 8767 | `studio-server`    |

`VITE_WS_PORT` in web `.env.development`; `PORT` overrides the server.

## Commands

`pnpm install` · `pnpm turbo run build` · **`pnpm lint`** (oxlint) · **`pnpm typecheck`** · **`pnpm test`** · **`pnpm fmt`** (oxfmt; `format` aliases `fmt`) · `pnpm --filter @lisca/<product>-desktop dev` · `cargo build --workspace` / `cargo run -p <crate>` · `cd python && uv sync`

## Conventions

Workspace scope **`@lisca/*`**. One root **`Cargo.toml`** workspace. Desktop packages **`devDependencies`** on their web + server so Turbo **`^build`** ordering works. **`pnpm.onlyBuiltDependencies`**: `electron`, `esbuild`. Shared product icons: **`assets/brand/`** (web via Vite `publicDir`; desktop/mobile `assets/` symlinks).

**TypeScript imports:** `@lisca/*` packages use **`NodeNext`** resolution with explicit **`.ts`** extensions in relative imports (e.g. `from "./types.ts"`). Vite web apps override to **`Bundler`** resolution (extensionless imports are fine). `package.json` exports point at **`src/*.ts`** source; `tsc` is for typecheck/declarations, not the runtime entrypoint.
