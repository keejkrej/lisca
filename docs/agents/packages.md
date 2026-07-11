# Packages monorepo layout

Shared libraries under `packages/*`. Apps import these via workspace protocol (`workspace:*`); prefer package subpaths over deep relative imports.

## Package map

| Package              | Role                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@lisca/contracts`   | Wire + on-disk assay schemas (Effect Schema). Subpath `@lisca/contracts/assay` for wizard/UI assay types.                          |
| `@lisca/utils`       | Client-side imaging helpers (frames, contrast, align grid, annotate masks, server address storage, crop status).                   |
| `@lisca/client`      | Effect runtime, HTTP/WS ports, session hooks, studio assay JSON helpers, Effect Atom query layers.                                 |
| `@lisca/analysis`    | Shared Studio results model: CSV/plot parsing, assay catalog constants, `createAnalysisPanelAtoms`.                                |
| `@lisca/ui-headless` | Shared non-DOM SolidJS state and UI logic (host picker, canvas handlers, status types, shortcuts).                                 |
| `@lisca/ui`          | SolidJS web imaging UI (zaidan/Kobalte + Tailwind). Re-exports shared UI types through `@lisca/ui/features`.                       |
| `@lisca/web-app`     | Vite web shell: port factory (`createLiscaPort`), shared CSS entry, host operations.                                               |
| `@lisca/web-demo`    | Browser-only demo helpers (`@lisca/web-demo/browser` — image load, contrast). Former `browser-frame` package.                      |
| `@lisca/storage`     | Sync storage abstraction with browser defaults and configurable adapters.                                                          |
| `@lisca/smart`       | Browser ML via transformers.js: `./segment` (SAM masks), `./segment/browser` (hook), `./exclude/browser` (ResNet smart exclusion). |

Desktop Tauri wrappers live under `apps/*/desktop`, not in `packages/*`.

## `@lisca/contracts` boundaries

- **`@lisca/contracts`** — HTTP wire types from `src/schema/`, assay on-disk schema from `assay.schema.ts`, decode helpers.
- **`@lisca/contracts/assay`** — Wizard and Studio UI assay types (`ASSAY_TYPE`, `StudioBasicInfoStep*`, `StudioAssayJson`, folder-source presets). Not part of the OpenAPI surface.

Do not import wizard types from the root contracts entry; use `/assay`.

## `@lisca/client` layout

```
packages/client/src/
  infra/          runtime, bootstrap, urls, port-core, api-client, errors
  session/        align-session, annotate sessions, crop-status, progress-poll
  hooks/          use-align-state-core, use-annotate-state-core
  studio/         studio-assay-json
  ports/          aligner, annotator, studio, host, analysis
  atoms/          Effect Atom UI state + query atoms
```

Public import paths (`@lisca/client/runtime`, `@lisca/client/align-session`, etc.) are stable; only internal file paths changed.

## `@lisca/analysis` layout

Mirrors Rust `analysis/assays/<name>/`:

```
packages/analysis/src/
  shared/           panels.ts (plot/CSV parsing), queries.ts
  assays/
    gene-expression/catalog.ts
    immune-killing/catalog.ts
  atoms/analysis-panels.ts   createAnalysisPanelAtoms factory
```

Apps keep thin `studio-analysis-atoms.ts` shims that call the factory with their runtime.

## `@lisca/utils` modules

| Module           | Contents                                               |
| ---------------- | ------------------------------------------------------ |
| `server.ts`      | WS URL formatting, saved server list                   |
| `frame.ts`       | `FrameResult`, `PixelArray`, decode/normalize contrast |
| `align-grid.ts`  | Grid geometry, wheel/pointer gestures, persistence     |
| `annotate.ts`    | Mask helpers, bbox CSV export                          |
| `crop-status.ts` | `isDoneCropStatus`                                     |

Barrel: `@lisca/utils` re-exports all modules.

## UI type re-exports

Apps should import shared UI types from `@lisca/ui/features`, not directly from `@lisca/ui-headless/*`, unless the app already depends on headless.

Examples: `AnnotationMode`, `HostFilePickerMode`, `cropConfirmCopy`.

## Removed / merged

- **`browser-frame`** — merged into `@lisca/web-demo/browser`.
- **`studio-result`** — renamed to `@lisca/analysis`.
- **`segmentation`** — renamed to `@lisca/smart` (`segment` + `exclude` subpaths).

## Verification

```sh
vp install
vp run typecheck
vp run check:contracts
```

After schema changes, run the filtered `generate` and `rust-types` tasks documented in [contracts.md](./contracts.md).
