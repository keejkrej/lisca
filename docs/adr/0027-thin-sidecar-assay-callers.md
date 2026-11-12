# ADR-0027: Thin assay callers into lisca-transfection, lisca-killing, and lisca-binding

- **Status:** accepted
- **Date:** 2026-11-12

## Decision

We will delegate all assay science, XLSX workbook exports, and `mplot` figure rendering to [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay), [`lisca-killing-assay`](https://github.com/keejkrej/lisca-killing-assay), and [`lisca-binding-assay`](https://github.com/keejkrej/lisca-binding-assay) behind symmetric thin callers in `crates/lisca/src/analysis/assays/{binding,killing,transfection}/`, because this monorepo owns scheduling, workspace contracts, and UI rather than assay kernels.

## Why

Previously, `crates/lisca/src/analysis/` mixed thin `lisca-transfection` dispatch with in-tree killing viability, workbook writers, `mplot` figure layouts, and Picasso LNP-binding kernels (`ADR-0015`), creating asymmetric single-file vs folder layouts and forcing scientific or plot changes to touch the product monorepo instead of the assay repositories.

Now that `lisca-killing` owns death-reporter viability, engagement summaries, and killing figures and `lisca-binding` owns `lnp_binding` Picasso detection, tables, workbooks, and trace plots, `crates/lisca` no longer depends directly on `mplot`, `picasso`, or `rust_xlsxwriter`. Each assay family lives in its own folder under `crates/lisca/src/analysis/assays/` (`binding/mod.rs`, `killing/{mod.rs,death_reporter.rs,engagement.rs}`, `transfection/mod.rs`) and converts `assay.json` sample mappings into sidecar calls that Studio's task scheduler orchestrates per Position.

## Looks like a bug when

- `Cargo.toml` in `lisca` has no direct `picasso`, `mplot`, or `rust_xlsxwriter` dependency while Studio analysis still writes XLSX workbooks and PNG figures.
- Assay math or figure styling lives in `lisca-transfection-assay`, `lisca-killing-assay`, or `lisca-binding-assay` rather than `crates/lisca/src/analysis/`.
