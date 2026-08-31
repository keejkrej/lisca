# LiSCA domain language

## Workflow

- **Image source** — an ND2 file, CZI file, or templated image folder that supplies
  position, channel, time, and Z frames.
- **Workspace** — the on-disk experiment directory containing alignment, ROI,
  annotation, assay, and result artifacts. BBox CSVs use `roi,x,y,w,h`; a
  one-shot in-place `crop`→`roi` header migration runs when a tool opens the
  workspace (`crop` is not a live alias).
- **Align session** — the interactive workflow that registers a frame to the
  micropattern grid, excludes unusable sites, saves site boxes, and starts ROI crop.
- **ROI crop** — creation of per-site TIFF stacks and an index from saved alignment boxes,
  while preserving position and site identity. Runs in Studio, CLI (`lisca-crop`),
  or the notebooks zip (`lisca.services.crop` in `python/`); not in the light Aligner shell.
- **Annotation session** — the interactive workflow that loads an ROI frame, edits
  its classification or segmentation mask, tracks history, and saves the annotation.
- **Assay** — the typed experiment description in `assay.json`, including the assay
  kind, source, positions, channels, timing, and analysis configuration.
- **Analysis run** — an Operation that executes the assay pipeline and writes
  result tables and plots.

## Background work

- **Operation** — one user-requested unit of background work, presented and tracked
  as a single aggregate even when it fans out internally.
- **Task** — the smallest independently scheduled part of an Operation; it is kept
  bounded enough to run, retry, or fail without treating the whole Operation as one
  indivisible computation.
- **Queue** — the scheduler-owned ordered set of runnable Tasks. Users create
  Operations, not Queues.

## Product composition

- **Aligner** hosts an Align session.
- **Annotator** hosts an Annotation session.
- **Studio** composes assay setup, Align and Annotation sessions, an Analysis run,
  and result review in one workflow.

## Transfection kinetic parameters

On-disk workspace table columns: [`docs/analysis/schema.md`](docs/analysis/schema.md).

Gene-expression fits (in `lisca-transfection`, imported by this repo) use the **basic translation–degradation model** (Müller et al.
2024 Eq. 3; **no protein maturation**). Public names are the same in Rust, Python,
`fit.csv` / `fit.xlsx`, and Studio labels. One name only — no CSV aliases.

| Code / CSV / id      | Display label           | Paper symbol                           |
| -------------------- | ----------------------- | -------------------------------------- |
| `onset_time`         | onset time t0           | t0                                     |
| `expression_rate`    | expression rate m0 k_TL | m0 k_TL                                |
| `mrna_lifetime`      | mRNA lifetime τ_mRNA    | τ_mRNA = ln(2)/δ                       |
| `protein_lifetime`   | protein lifetime τ_EGFP | τ_EGFP = ln(2)/β                       |
| `baseline_intensity` | baseline intensity      | additive baseline (not a kinetic rate) |
| `auc`                | AUC                     | integrated protein output              |

Internal solver fields — **not** written to `fit.csv` / `fit.xlsx`:

| Code (internal only)       | Meaning                  | Paper symbol      |
| -------------------------- | ------------------------ | ----------------- |
| `mrna_degradation_rate`    | mRNA degradation rate    | δ                 |
| `protein_degradation_rate` | protein degradation rate | β                 |
| `expression_amplitude`     | (internal fit coeff.)    | m0 k_TL / (δ − β) |

Lifetimes are **half-lives** ln(2)/δ and ln(2)/β, not 1/rate.
Stored times (`onset_time`, lifetimes) are in **minutes**; plots may show hours.

Use **onset time** for t0 — never “transfection efficiency”, “translation onset”, or
“transfection onset” as the product name. Use **expression rate** for m0 k_TL;
reserve “efficiency” for delivery/escape fractions.

## Models

Product / any-assay tools stay in this repo (`models/smart-exclusion-resnet18`,
`models/smart-segment-slimsam`; `mupattern-resnet18` is legacy reference).
Assay-specific brains do not: transfection pattern U-Net is
`keejkrej/single-cell-pattern-unet` (`LISCA_PATTERN_SEG_MODEL`); killing ResNet
is `keejkrej/killing-assay-resnet18` (curl at Studio package time). See
[`models/README.md`](models/README.md).
