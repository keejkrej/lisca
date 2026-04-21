# LISCA Monorepo

This repository contains the shared `lisca` pipeline layers plus the current LISCA applications:

- `packages/lisca/python`: shared Python data IO and quantitative analysis helpers
- `packages/lisca/typescript`: shared TypeScript viewer contracts, state, UI, and host integration
- `packages/lisca/rust`: shared Rust native backend for viewer workflows
- `apps/viewer`: standalone Tauri viewer shell
- `apps/delivery`: delivery-specific Python workflows
- `apps/delivery-rs`: delivery-specific Rust CLI intended to replace the packaged Python binary
- `apps/apoptosis`: apoptosis-specific Python workflows
- `apps/studio`: reserved for the integrated desktop app

The `packages/lisca/*` directories are not parallel reimplementations of the same package surface in different languages. They are different layers of the same pipeline, implemented in the language best suited to each layer.

## Architecture

- Python `lisca` provides shared `lisca.data.*` and `lisca.analysis.*` APIs for microscopy IO and derived metrics.
- Rust `lisca` provides `lisca::viewer::*` as the native desktop/backend layer for viewer operations.
- TypeScript `lisca` provides `lisca/viewer/*` as the frontend/viewer layer.

The package root name is shared across languages, but the module trees do not need to mirror each other. New shared code should be added according to the pipeline layer it belongs to, not to force cross-language symmetry.

The repository root is workspace-only. Python, TypeScript, and Rust packages live at their language-specific package roots.

## Monorepo Tasks

The TypeScript workspace uses Turbo for package-aware task orchestration:

- `bun run build`: build every JS workspace package that defines a `build` script
- `bun run typecheck`: run `typecheck` across the JS workspace
- `bun run test`: run package tests across the JS workspace
- `bun run build:viewer`: build only the viewer app
- `bun run build:annotator`: build only the annotator app
- `bun run dev:viewer`: start the viewer app in dev mode
- `bun run dev:annotator`: start the annotator app in dev mode
- `bun run check`: run JS typechecks and `cargo check --workspace`

Rust remains managed by Cargo directly via `bun run check:rust` or plain `cargo` commands.
