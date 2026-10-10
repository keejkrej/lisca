# Studio analysis

## TypeScript (`@lisca/analysis`)

Pure **results model** for the Studio web app. Layout mirrors Rust `analysis/assays/<name>/`:

- `shared/plots.ts` — catalog of Rust PNG artifacts, sectioning, assay inference
- `assays/transfection/catalog.ts` — transfection plot filenames, labels, and workspace vs sample scope
- `assays/killing/catalog.ts` — killing plot filenames and labels
- `fixtures/` — placeholder PNGs with the same filenames the Rust pipeline writes

The package is pure model logic. Studio-coupled atoms live in
`apps/studio/web/src/atoms/studio-analysis-atoms.ts`, where the model is wired to the
`StudioPortService` runtime.

## Analysis gallery

`apps/studio/web/src/analysis/analysis-plot-gallery.tsx` shows the PNG files the Rust
pipeline already wrote via mplot-rs (`AnalysisPlotGallery`). There is no in-app chart
renderer. Studio lists PNGs from the analysis manifest (`results/*.png` workspace
boxplots and `results/<sample>/*.png` packs) and serves them at `GET /fs/file?path=`.
Per-sample titles include the sample folder (for example
`Intensity traces (A431_aiLNP)`).

Sections stay assay-aware: Traces / Parameters (transfection) vs Traces /
Compare (killing). Compare is the mean fluorescence for each sample.

## Analysis demo

`apps/studio/demo` is a browser-only mock of the analysis page. It loads fixture PNGs
for both shipping assays so the team can iterate on the gallery without a workspace.

```sh
pnpm run dev:studio-demo
```

Opens [http://localhost:5177](http://localhost:5177). Switch `transfection.fixture` /
`killing.fixture` in the navbar. See `apps/studio/demo/README.md`.

## Workspace fixtures (e2e / agents)

`@lisca/fixtures` writes a real on-disk source folder or workspace so tests and
agents can skip earlier pipeline steps. This is separate from the analysis demo
PNGs above.

```sh
# Only test analysis
pnpm run fixture:workspace -- --assay transfection --stage cropped --out /tmp/tf-analyze

# Only test align
pnpm run fixture:workspace -- --assay killing --stage assay --out /tmp/kill-align
```

Stages: `source`, `assay`, `aligned`, `cropped`, `annotated`, `analyzed`.
See `packages/fixtures/README.md`.

## Rust pipeline

Native analysis pipeline in `crates/lisca/src/analysis/` plus git crates for
mature assays. ROI stacks under `roi/` come from **Studio crop**, CLI (`lisca-crop`),
or the notebooks zip (`lisca.services.crop` in `python/`) — not from the light Aligner shell. The running workflow
depends on `assay.json` → root `type`:

| Assay          | Goal source (not implementation reference)                                                                                    | Pipeline                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `transfection` | [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay) — Python + Rust crate imported via git URL | segment → traces → AUC → fit (+ plots) in `lisca-transfection`; Studio ONNX segment stays here |
| `killing`      | Death reporter. Signal-channel fluorescence in each ROI crop. No classifier and no fit.                                       | traces → plot-traces                                                                           |

Numeric stages and PNG plots for transfection run in the imported
[`lisca-transfection`](https://github.com/keejkrej/lisca-transfection-assay) crate
via [**mplot-rs**](https://github.com/keejkrej/mplot-rs). Death-reporter killing and fluorescent engagement do not load a model. Desktop packaging does not download or bundle ONNX weights.

**Python-first → imported crate process, tolerances, and assay map:** [`parity.md`](./parity.md). Transfection Python+Rust parity lives in the sidecar (`docs/parity.md` there). Agent workflow: `/lisca-parity`.

## Design stance

Sibling **goal sources** (`lisca-*-assay` packages, mupattern) describe **what** to compute and **which files** to read/write. Mature transfection analysis is **imported** from `lisca-transfection-assay` (git crate + Python package). Killing remains in-tree until its sidecar exists.

Rust in this crate should stay idiomatic:

- Shared ROI I/O in `roi_stack.rs` / `csv_io.rs`; crop in `lisca-crop`.
- Transfection stages: call `lisca-transfection` (Otsu, traces, AUC, fit, plots). Do not keep a second full pipeline under `assays/transfection/`.
- Product Smart exclude / Smart segment models stay in `models/`. Transfection
  ONNX segment may stay as a Studio adapter (`segment_onnx.rs` + `ort`) until
  the sidecar un-stubs it; resolve `keejkrej/single-cell-pattern-unet` via
  `LISCA_PATTERN_SEG_MODEL`, not as a lisca-owned assay brain.
- Killing: per-assay code under `assays/killing/` (fluorescence) and
  `assays/killing_engagement.rs` (spot counts). Analyze does not load the
  ResNet. Desktop packaging does not download or bundle ONNX weights.
- Parity for transfection is judged in the sidecar; this repo’s wrapper tests check the dispatch still writes the workspace contract.

## Transfection pipeline

Order matches `transfection pipeline` / `lisca-analyze pipeline`:

```
assay.json → segment → traces → plot-traces → auc → plot-auc → fit → plot-fit → CSV/XLSX outputs
```

Progress stages (HTTP/WS contract): `preparing → segment → traces → auc → fit → completed`.

Plot steps run between their corresponding table stages but do not emit separate progress events.

Studio schedules the Analysis run as Steps: `analysis/transfection/segment/Pos{n}`
and `analysis/transfection/traces/Pos{n}` (one Step per Position; Rust entry point
`lisca_transfection::run_position_traces`), then `analysis/transfection/plot-traces`,
`auc`, `plot-auc`, `fit`, and `plot-fit`. The `traces` stage writes the per-Position
`analysis/Pos{n}/ch{m}.csv` files (`AnalysisCsvFile.kind` `"traces"`).

## Killing pipeline

Death reporter (`assayId` `killing`) measures fluorescence in each existing ROI crop. It does not segment, detect cells, fit a curve, or run a classifier. The signal channel comes from `analysis.channels.signal`. Each crop plane at z=0 uses the same full-frame reduction as transfection `analysis.skipSegment`: area is the pixel count, background is the 10th percentile, and corrected fluorescence is the sum minus area times background.

```
assay.json → analysis/Pos{n}/ch{m}.csv → results/<sample>/traces.xlsx + one PNG per sample
```

Studio steps: `analysis/killing/traces/Pos{n}` (one per Position), then
`analysis/killing/plot-traces`, then finalize. Each PNG is one sample.
`traces.png` is every cell. `traces_summary.png` is the mean, median, and
interquartile range. `_shared_y` uses one scale across samples. Studio places
the same-named files next to each other. The Excel file is the table to replot.

### Killing outputs

| Path                                                                 | Role                                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `analysis/Pos{n}/ch{m}.csv`                                          | Per-cell fluorescence (`roi`, `t`, `area`, `background`, `sum`, `corrected`) |
| `results/<sample>/traces.xlsx`                                       | Those rows for the sample, with a `pos` column                               |
| `results/<sample>/traces.png`, `traces_shared_y.png`                 | Per-cell fluorescence for that sample                                        |
| `results/<sample>/traces_summary.png`, `traces_summary_shared_y.png` | Mean, median, and interquartile range of that fluorescence                   |

`ch{m}` is a signal channel, not the segmentation channel. There is no CSV under
`results/` and no subplot grid. Older killing Workspaces wrote
`timeseries/Pos{n}/`; the `killing_traces_dir` migration renames it to `traces/`
on open (see [Workspace migrations](#workspace-migrations)). The live writer does
not use `traces/`.

### Engagement

`killing-engagement` counts round spots on the first signal channel inside each
ROI. The spot diameter is about 10 pixels (kept when the equivalent diameter is
7 to 13 pixels). Every ROI in a position shares one scale: the median
background, plus 8 robust noise widths. A crop is not stretched to its own
brightest pixel. Two touching spots are split by a distance-transform
watershed. `t_cells` is that spot count. `engagements` still records whether a
spot touches the brightfield tumor mask. The gallery plots `t_cells`.

Studio offers the card in the picker. See
[ADR-0009](../adr/0009-shared-killing-workspace.md).

| Path                                             | Role                                              |
| ------------------------------------------------ | ------------------------------------------------- |
| `analysis/Pos{n}/engagement.csv`                 | Per-frame `tumor_cells`, `t_cells`, `engagements` |
| `analysis/Pos{n}/engagement_summary.csv`         | Mean counts per ROI                               |
| `results/<sample>/engagement.xlsx`               | Those rows for the sample, with a `pos` column    |
| `results/<sample>/engagement_summary.xlsx`       | Mean counts per ROI, with a `pos` column          |
| `results/<sample>/engagement_traces.png`         | Per-cell engager counts for that sample           |
| `results/<sample>/engagement_traces_summary.png` | Mean, median, and interquartile range             |

Shared-y companions use the same names with `_shared_y`. Filenames stay off
`traces.png` and `traces.xlsx`, so a death-reporter run on the same workspace
keeps `analysis/Pos{n}/ch{m}.csv` and `results/<sample>/traces.*`. There is no
CSV under `results/`.

## Workspace I/O

Folder names, bbox CSV (`roi, x, y, w, h`), `roi/Pos{n}/index.json`, and locked
analysis/results column names live in [`schema.md`](./schema.md). Import folder
names from `lisca.core.paths` / crate `lisca-workspace`. Grid `i,j` lives in
`align/Pos{n}.json`; bbox CSV is an export artifact. `crop` is not a live header
alias — `migrate_workspace` rewrites it on open (see [Workspace migrations](#workspace-migrations)).

| Path                     | Role                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `assay.json`             | Nested domain contract (`type`, `data`, `workspace`, `interval`, `samples`, optional `analysis` with `channels` / `sampleChannels`) |
| `bbox/PosN.csv`          | ROI boxes (`roi,x,y,w,h`). See [`schema.md`](./schema.md).                                                                          |
| `roi/PosN/`              | Cropped ROI stacks + slim `index.json` — see [`schema.md`](./schema.md)                                                             |
| `mask/PosN/`             | Per-frame segmentation masks (`uint8` TIFF stacks)                                                                                  |
| `analysis/` / `results/` | Shared folder names. Table columns: [`schema.md`](./schema.md). CSV only under `analysis/`; XLSX and PNG under `results/<sample>/`. |

There is no `traces/` folder for transfection (its Traces are `analysis/Pos{n}/ch{m}.csv`), no combined results tables, and no CSV under `results/` for transfection. Studio results UI displays PNG files; it does not re-render plots from CSVs.

### Workspace migrations

Tools call `migrate_workspace` (Rust `crates/lisca/src/migrations`, Python
`lisca.migrations`) once when they open a Workspace, so live parsers stay strict
and never read old names. Migrations run in order, are idempotent, and report the
paths they rewrote:

| Migration               | Rewrites                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bbox_crop_to_roi`      | `bbox/Pos{n}.csv` header `crop` → `roi`                                                                                                                                                                                                                                                                                          |
| `assay_samples_by_name` | `assay.json`: drops `samples[].slideChannel` (blank names become `Sample {slideChannel}`); `analysis.sampleChannels[].slideChannel` → `sample` (that Sample's name); `mask` → `segmentation` in `analysis.channels` and each `sampleChannels` row. Errors on duplicate names, an unknown `slideChannel`, or a key in both forms. |
| `killing_traces_dir`    | Killing `timeseries/` → `traces/`. If both exist, an empty or byte-identical `timeseries/` is removed; differing trees are an error.                                                                                                                                                                                             |

Details: [`schema.md`](./schema.md).

## Module map

```
analysis.rs            # crate module root (no mod.rs)
analysis/
  pipeline.rs          # load assay.json, dispatch
  progress.rs          # shared progress + spawn_blocking helper
  array.rs             # Frame2D, masked ROI stats, trapz AUC, kinetic basis, ndarray-stats quantiles
  sample.rs            # SampleAnalysis / SampleMapping, build_sample_mapping (shared)
  roi_stack.rs         # ROI TIFF stacks (shared)
  csv_io.rs, output.rs, export.rs
  plot.rs + plot/      # shared mplot-rs helpers
  assays.rs            # match assay type → pipeline
  assays/
    transfection.rs + transfection/   # thin dispatch + local ONNX segment
      mapping.rs       # lisca SampleMapping → lisca-transfection mapping
      segment.rs       # Otsu → git crate; ONNX adapter stays here (HF weights)
      segment_onnx.rs  # Studio ONNX adapter (`LISCA_PATTERN_SEG_MODEL` / HF)
    killing.rs + killing/
```

| Module                                | Goal                                                              |
| ------------------------------------- | ----------------------------------------------------------------- |
| `assays/transfection/`                | Dispatch into `lisca-transfection`; Studio ONNX adapter           |
| `assays/transfection/segment_onnx.rs` | Studio ONNX adapter; weights via `LISCA_PATTERN_SEG_MODEL` / HF   |
| `lisca-transfection` (git)            | Otsu, traces, AUC, kinetic fit, PNG plots, sample XLSX publishers |
| `assays/killing/`                     | ResNet presence, monotonicity clean, death times, kill curve      |

Adding a new assay type: create `assays/<name>.rs` plus `assays/<name>/`, implement `run` (async) and optionally `run_sync`, then register in `assays.rs`.

## Plot runtime

Plots render natively in Rust (no Python sidecar). Figure layout constants match transfection (`12×8` in, log-scale AUC boxplot, fluor trace colors, etc.). Transfection `run_plot_*` writes PNG only; `publish_sample_*_xlsx` (Studio/`lisca-analyze` plot commands and pipeline) writes `results/<sample>/{traces,auc,fit}.xlsx`. Per-sample kinetic scatters are log-log joint plots (`expression_rate_vs_onset_time.png`, `expression_rate_vs_mrna_lifetime.png`).

## Parity expectations (outputs, not code)

Summary — full process, tolerances table, and lifecycle in [`parity.md`](./parity.md):

- **Contract parity**: `assay.json` semantics, output paths, CSV column names, PNG filenames Studio expects.
- **Scientific parity**: same definitions (e.g. corrected = intensity − area × background; trapezoidal AUC; kill monotonicity clean).
- **Not required**: matching Python module names, NumPy vs loop structure, or bitwise float identity.
- Position ranges in `assay.json` use **inclusive** Studio semantics (`1:12` → positions 1…12).
- Segmentation defaults: Otsu backend with `variation_radius=2`, `gaussian_sigma=1.0`.
- Optional ONNX fg/bg backend for higher-quality masks. The student U-Net is a
  **transfection-assay** model ([keejkrej/single-cell-pattern-unet](https://huggingface.co/keejkrej/single-cell-pattern-unet)),
  resolved via `LISCA_PATTERN_SEG_MODEL` / `--model-dir`. Studio keeps a local
  ONNX adapter until the sidecar un-stubs ONNX; do not add new assay weights
  under `models/` (see [`models/README.md`](../../models/README.md)):

  ```sh
  huggingface-cli download keejkrej/single-cell-pattern-unet \
    --local-dir /tmp/single-cell-pattern-unet
  export LISCA_PATTERN_SEG_MODEL=/tmp/single-cell-pattern-unet/onnx
  ./target/release/lisca-analyze segment ~/data/TF84 --backend onnx --force
  ```

  Default Studio/`pipeline` segment remains **Otsu** until you opt into `--backend onnx`.

- Fit uses the two-pass pooled-protein strategy on the **basic translation–degradation model** (onset time t0, expression rate m0 k_TL, mRNA/protein lifetimes τ = ln(2)/rate; **no maturation**). Optional `analysis.maxOnsetMinutes` in `assay.json` is **transfection-only** (default **`120`** when omitted for that assay; set `0` to fix onset time t0 at 0). Other assays ignore it. Public CSV/UI names: `onset_time`, `expression_rate`, `mrna_lifetime`, `protein_lifetime`, `baseline_intensity` (no alternate aliases). `mrna_degradation_rate` (δ), `protein_degradation_rate` (β), and `expression_amplitude` are internal solver fields, not CSV. Stored times are minutes; plots may show hours. See [`CONTEXT.md`](../../CONTEXT.md).
- Comparing two finished Workspaces is not an analysis stage. The offline script is [`batch-harmonization.md`](./batch-harmonization.md).
- Frame interval (`interval.value` / `interval.unit`) is **general**. Transfection defaults to **10 minutes** when omitted. Studio prefills death-reporter killing at **5 minutes**; analysis still requires an explicit positive interval for killing when `interval.value` is missing. Optional `analysis.skipSegment` skips Otsu and uses full-ROI p10 background.
- Samples are `samples[]: {name, positions}`. `positions` is 0-based: one index (`3`), an inclusive range (`0:4`), or several of those separated by commas (`0:4,20:24`). A gap stays a gap. A Sample is identified by its name: non-empty after trim and unique within the assay (compared trimmed). The sample mapping (`build_sample_mapping` → `SampleMapping` of `SampleAnalysis`) keeps assay order. `results/<sample>/` uses the filesystem-safe name, prefixed with the 0-based assay index (`{index}_{safe}`) only when two names sanitize to the same folder.
- Channel indices live under `analysis`, not on sample rows: `analysis.channels.{segmentation,signal}` (default Segmentation channel and Signal channels) and optional `analysis.sampleChannels[]` overrides `{sample, segmentation, signal}`, where `sample` is a `samples[].name`. `signal` is a non-empty int list (one Trace CSV per Signal channel).

  ```json
  {
    "samples": [
      { "name": "A431_aiLNP", "positions": "0:39" },
      { "name": "A549_aiLNP", "positions": "40:79" }
    ],
    "analysis": {
      "channels": { "segmentation": 0, "signal": [1] },
      "sampleChannels": [{ "sample": "A549_aiLNP", "segmentation": 0, "signal": [2] }]
    }
  }
  ```

## Parity CLI (`lisca-analyze`)

Rust stage CLI shaped like sibling [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay) so the same workspace can be driven from either side. `lisca-analyze` calls the git crate (plus local ONNX segment). Process and side-by-side recipe: [`parity.md`](./parity.md).

```sh
cargo build -p lisca --release --bin lisca-analyze

# Stage commands (mirror transfection CLI; mapping from assay.json)
./target/release/lisca-analyze segment ~/data/TF84
./target/release/lisca-analyze traces ~/data/TF84
./target/release/lisca-analyze auc ~/data/TF84
./target/release/lisca-analyze fit ~/data/TF84
./target/release/lisca-analyze plot-traces ~/data/TF84
./target/release/lisca-analyze plot-auc ~/data/TF84
./target/release/lisca-analyze plot-fit ~/data/TF84

# Full pipeline from assay.json
./target/release/lisca-analyze pipeline ~/data/TF84
```

`--interval` / `--max-onset-minutes` may be omitted when `assay.json` has `interval` and optional `analysis.maxOnsetMinutes`. `--assay` defaults to `<workspace>/assay.json`. Plot commands also accept transfection-style paths (`…/analysis`, `…/analysis/PosN/auc.csv`, `…/analysis/PosN/fit.csv`).

## Tests

```sh
cargo test -p lisca
cargo test -p lisca --test transfection_parity -- --ignored   # needs sibling assay + uv
```

Unit tests live under each `analysis/` submodule. Integration tests in `crates/lisca/tests/transfection_parity.rs` build a minimal synthetic workspace and compare stages to transfection reference formulas. Tolerances and ignored Python e2e: [`parity.md`](./parity.md).
