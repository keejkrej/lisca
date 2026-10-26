# ADR-0015: LNP binding uses Picasso in this repo until a sidecar exists

- **Status:** accepted
- **Date:** 2026-10-26

## Decision

We will ship `lnp-binding` from this monorepo, calling
[`picasso-rs`](https://github.com/keejkrej/picasso-rs) for spot identify and
Gaussian fit, because there is no mature `lisca-binding-assay` crate to import
and Picasso already exposes a binding detect API.

## Why

Mature transfection and killing kernels live in sibling git crates. Binding has
the same intended destination (`lisca-binding-assay`), but that repository is
not a product crate yet. Picasso already implements `detect_spots_u16_slice`,
`filter_spots`, and `spot_counts` for this assay. Waiting would leave
`assay.json` type `lnp-binding` as an unsupported id. Reimplementing
localization here would duplicate Picasso.

Rejected alternatives:

- Leave `lnp-binding` unregistered until a sidecar exists. The type is already
  on the closed enum, and a handwritten `assay.json` used to fail as
  unsupported.
- Copy Picasso identify/fit into `crates/lisca`. The owner asked to use
  picasso-rs and not to patch that repo in this change.

Workspace I/O, sample mapping, LISCA CSV/XLSX names, and per-sample traces
figures stay here. When `lisca-binding-assay` exists, this module should shrink
to dispatch the way killing does.

## Looks like a bug when

- Binding science changes land in this repo instead of a sidecar.
- Picasso grows cell-mask filtering or camera calibration that LISCA does not
  yet read from `mask/` or `assay.json`.
