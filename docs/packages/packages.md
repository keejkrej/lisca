# Packages monorepo layout

Shared libraries under `packages/*`. Apps import these via workspace protocol (`workspace:*`); prefer package subpaths over deep relative imports.

## Package map

| Package              | Role                                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@lisca/contracts`   | Wire + on-disk assay schemas (Effect Schema). Subpath `@lisca/contracts/assay` for wizard/UI assay types.                          |
| `@lisca/utils`       | Framework-free client logic: imaging helpers, storage adapters, annotation tools, shortcuts, task-center and picker models.        |
| `@lisca/client`      | Effect runtime, HTTP/WS ports, session hooks, studio assay JSON helpers, Effect Atom query layers.                                 |
| `@lisca/analysis`    | Pure Studio results model: CSV/plot parsing, chart specs, and assay catalog constants.                                             |
| `@lisca/ui-headless` | Solid-coupled non-DOM state and interaction logic, plus the structural types and policies that directly support those modules.     |
| `@lisca/ui`          | SolidJS web imaging UI (zaidan/Kobalte + Tailwind). Re-exports shared UI types through `@lisca/ui/features`.                       |
| `@lisca/web-app`     | Vite web shell: port factory (`createLiscaPort`), shared CSS entry, host operations.                                               |
| `@lisca/web-demo`    | Browser-only demo helpers (`@lisca/web-demo/browser` — image load, contrast). Former `browser-frame` package.                      |
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
  charts/           renderer-neutral chart specs and data transforms
  result/           result-panel loading
  assays/
    transfection/catalog.ts
```

Studio owns its runtime-coupled analysis atoms and Observable Plot renderer under
`apps/studio/web/src/{atoms,result}/`.

## `@lisca/utils` modules

| Module                   | Contents                                                             |
| ------------------------ | -------------------------------------------------------------------- |
| `storage.ts`             | Browser storage defaults, configurable adapters, JSON read/write     |
| `server.ts`              | HTTP URL formatting, saved server list                               |
| `frame.ts`               | `FrameResult`, `PixelArray`, decode/normalize contrast               |
| `align-grid.ts`          | Grid geometry, wheel/pointer gestures, persistence                   |
| `annotate.ts`            | Mask helpers, bbox CSV export                                        |
| `annotation-tools.ts`    | Annotation tool ids, families, grid definitions, capability helpers  |
| `task-center.ts`         | Framework-free task-center gateway types, reconciliation, derivation |
| `work-session-picker.ts` | Work-session picker models and display derivation                    |
| `host.ts`                | Host file-picker mode and operation types                            |
| `shortcuts.ts`           | Keyboard shortcut types and matching                                 |
| `crop-status.ts`         | `isDoneCropStatus`                                                   |

Barrel: `@lisca/utils` re-exports all modules.

## UI type re-exports

Apps should import UI-facing types re-exported by `@lisca/ui/features`. Framework-free APIs that are not UI component contracts come from `@lisca/utils`; apps should not reach into `@lisca/ui-headless/*` for them.

Examples: `AnnotationMode`, `HostFilePickerMode`, `cropConfirmCopy`.

## Removed / merged

- **`browser-frame`** — merged into `@lisca/web-demo/browser`.
- **`studio-result`** — renamed to `@lisca/analysis`.
- **`segmentation`** — renamed to `@lisca/smart` (`segment` + `exclude` subpaths).
- **`@lisca/storage`** — folded into `@lisca/utils/storage.ts`; adapter injection remains available from the utils barrel.

## Verification

`vp lint` enforces public package subpaths, the contracts assay/UI subpath, UI feature-domain isolation, the shared-package-to-app direction, and workspace dependency declarations. The local `lisca-boundaries/imports` rule reads each workspace manifest and accepts declarations from dependencies, dev dependencies, optional dependencies, or peer dependencies.

```sh
vp install
vp lint
vp run typecheck
vp run check:contracts
```

After schema changes, run the filtered `generate` and `rust-types` tasks documented in [contracts.md](./contracts.md).
