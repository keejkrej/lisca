# Studio analysis

## TypeScript (`@lisca/analysis`)

Shared **results model** for web and mobile Studio apps. Layout mirrors Rust `analysis/assays/<name>/`:

- `shared/panels.ts` — parse analysis CSVs, build chart panels (`ResultPanel`)
- `assays/gene-expression/catalog.ts` — gene-expression plot IDs and labels
- `assays/immune-killing/catalog.ts` — immune-killing result file ordering
- `atoms/analysis-panels.ts` — `createAnalysisPanelAtoms(runtime)` factory

Apps import `@lisca/analysis` and wire the factory with their `StudioPortService` runtime.

## Chart spec (`@lisca/analysis/charts`)

Platform-agnostic chart layer between panel models and renderers:

- `chartSpecForPanel(panel)` — `ResultPanel` → `ChartSpec` (series, axes, histogram bins)
- `chart-data.ts` — pivot panel specs into Victory row shapes
- `theme.ts` — palette, margins, font defaults
- `capabilities.ts` — which panel kinds each platform supports

Pure logic only — no React, no Observable Plot, no Victory.

## Platform renderers

| Platform | Package | Renderer |
| -------- | ------- | -------- |
| Web | `@lisca/ui/features` | Observable Plot (`ResultPanelsGridView`) |
| Mobile | `@lisca/ui-native/features` | Victory Native XL on Skia (`ResultPanelsGridView`) |

Studio apps wire data loading; chart UI lives in the UI packages.

## Rust pipeline

Native analysis pipeline in `crates/lisca/src/analysis/`. The running workflow depends on `assay.json` → `assayId`:

| Assay             | Goal source (not implementation reference)                                                   | Pipeline                                        |
| ----------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `gene-expression` | sibling [`transfection`](../../transfection) — stages, CSV columns, plot names               | segment → timeseries → AUC → fit (+ plots)      |
| `immune-killing`  | [mupattern](https://github.com/keejkrej/mupattern) — kill curve semantics, ResNet classifier | predict → clean → death times → kill curve plot |

Numeric stages and PNG plots run in Rust via [**mplot-rs**](https://github.com/keejkrej/mplot-rs). Immune killing inference uses ONNX Runtime (`ort`) with the `keejkrej/mupattern-resnet18` model.

## Design stance

Sibling repos (**transfection**, **mupattern**) describe **what** to compute and **which files** to read/write. They are **not** Rust implementation references — do not mirror their NumPy loops, module layout, or Python packaging.

Rust should be idiomatic for this crate:

- Shared ROI math in `array.rs` (`ndarray`, `ndarray-stats`) and segmentation via `ndarray-ndimage` + `imageproc` (Otsu).
- Per-assay pipelines under `assays/<name>/`.
- Parity is judged on **workspace outputs and scientific meaning** (tolerances in tests), not on matching Python evaluation order or data structures.

## Gene expression pipeline

Order matches `transfection-analyze.sh`:

```
assay.json → slide.json → segment → timeseries → plot-timeseries → auc → plot-auc → fit → plot-fit → CSV/XLSX outputs
```

Progress stages (HTTP/WS contract): `preparing → segment → timeseries → auc → fit → completed`.

Plot steps run between their corresponding table stages but do not emit separate progress events.

## Immune killing pipeline

Ports the mupattern kill workflow (predict → clean → plot) to Studio ROI stacks (`roi/PosN/` TIFF stacks, not crops.zarr):

```
assay.json → slide.json → predict (ResNet ONNX) → clean (monotonicity) → death times → plot kill curve
```

Progress reuses the same HTTP stage names with kill-specific messages:

| Stage        | Kill step                          |
| ------------ | ---------------------------------- |
| `preparing`  | Resolve ONNX model + slide mapping |
| `segment`    | Cell presence inference            |
| `timeseries` | Monotonicity clean                 |
| `auc`        | Death times + kill curve table     |
| `fit`        | Kill curve PNG                     |

### Kill model path

Set `LISCA_KILL_MODEL` to a directory containing `model.onnx`, or place the exported ONNX model at `workspace/models/mupattern-resnet18/model.onnx`. Export from Hugging Face:

```sh
uv run optimum-cli export onnx --model keejkrej/mupattern-resnet18 ./models/mupattern-resnet18
```

### Immune killing outputs

| Path                              | Role                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| `results/predictions.csv`         | Raw `(t, crop, label, pos, slide_channel)` from ResNet        |
| `results/predictions_cleaned.csv` | Monotonicity-enforced labels                                  |
| `results/death_times.csv`         | Per-ROI death frame (`≥80%` true span, mupattern clean logic) |
| `results/kill_curve.csv`          | `n_alive` vs time per slide channel                           |
| `results/kill_curve.png`          | Kill curve plot                                               |

## Workspace I/O

| Path                                                                         | Role                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `assay.json`                                                                 | Input contract from Studio basic info                  |
| `slide.json`                                                                 | Snake-case slide channel mapping (transfection format) |
| `roi/PosN/`                                                                  | Cropped ROI stacks + `index.json` (`axisOrder: TCZYX`) |
| `mask/PosN/`                                                                 | Per-frame segmentation masks (`uint8` TIFF stacks)     |
| `timeseries/sc{S}_ch{C}.csv`                                                 | Mask-corrected intensity metrics (+ parallel `.xlsx`)  |
| `results/auc.csv`                                                            | Trapezoidal AUC per `(pos, roi)` trace (+ `.xlsx`)     |
| `results/fit.csv`                                                            | Two-exponential kinetic fit parameters (+ `.xlsx`)     |
| `results/traces.png`, `traces_shared_y.png`, `area.png`, `area_shared_y.png` | Timeseries plots                                       |
| `results/auc.png`                                                            | AUC boxplot                                            |
| `results/{parameter}.png`, `results/traces_fit.png`                          | Fit parameter boxplots and fitted trace grid           |

Studio results UI reads CSVs for interactive charts; PNG filenames match transfection output.

## Module map

```
analysis.rs            # crate module root (no mod.rs)
analysis/
  pipeline.rs          # load assay.json, dispatch
  progress.rs          # shared progress + spawn_blocking helper
  array.rs             # Frame2D, masked ROI stats, trapz AUC, kinetic basis, ndarray-stats quantiles
  slide.rs             # slide channel mapping (shared)
  roi_stack.rs         # ROI TIFF stacks (shared)
  csv_io.rs, output.rs, export.rs
  plot.rs + plot/      # shared mplot-rs helpers
  assays.rs            # match assayId → pipeline
  assays/
    gene_expression.rs + gene_expression/
      traces.rs        # shared timeseries CSV grouping for AUC/fit/plots
    immune_killing.rs + immune_killing/
```

| Module                                 | Goal                                                         |
| -------------------------------------- | ------------------------------------------------------------ |
| `assays/gene_expression/segment.rs`    | Otsu mask per ROI frame                                      |
| `assays/gene_expression/timeseries.rs` | Mask-corrected intensity traces → `timeseries/` CSVs         |
| `assays/gene_expression/auc.rs`        | Trapezoidal AUC per trace                                    |
| `assays/gene_expression/fit.rs`        | Two-exponential kinetic fit                                  |
| `assays/gene_expression/plot/`         | PNGs for traces, AUC, fit parameters                         |
| `assays/immune_killing/`               | ResNet presence, monotonicity clean, death times, kill curve |

Adding a new assay type: create `assays/<name>.rs` plus `assays/<name>/`, implement `run` (async) and optionally `run_sync`, then register in `assays.rs`.

## Plot runtime

Plots render natively in Rust (no Python sidecar). Figure layout constants match transfection (`12×8` in, log-scale AUC boxplot, fluor trace colors, etc.).

## Parity expectations (outputs, not code)

- **Contract parity**: `assay.json` / `slide.json` semantics, output paths, CSV column names, PNG filenames Studio expects.
- **Scientific parity**: same definitions (e.g. corrected = intensity − area × background; trapezoidal AUC; kill monotonicity clean).
- **Not required**: matching transfection/mupattern module names, NumPy vs loop structure, or bitwise float identity.
- Position ranges in `assay.json` use **inclusive** Studio semantics (`1:12` → positions 1…12).
- Segmentation defaults: `variation_radius=2`, `gaussian_sigma=1.0`.
- Fit uses the two-pass pooled-protein strategy with `max_onset_minutes=0` unless extended later.

## Tests

```sh
cargo test -p lisca
```

Unit tests live under each `analysis/` submodule. Golden workspace fixtures (when available) assert output shape and numeric tolerance — not Python source equivalence.
