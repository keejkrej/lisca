# Studio analysis

## TypeScript (`@lisca/analysis`)

Pure **results model** for the Studio web app. Layout mirrors Rust `analysis/assays/<name>/`:

- `shared/panels.ts` — parse analysis CSVs, build chart panels (`ResultPanel`)
- `assays/transfection/catalog.ts` — transfection plot IDs and labels

The package is pure model/chart logic. Studio-coupled atoms live in
`apps/studio/web/src/atoms/studio-analysis-atoms.ts`, where the model is wired to the
`StudioPortService` runtime.

## Chart spec (`@lisca/analysis/charts`)

Pure chart-spec layer between panel models and the Studio web renderer:

- `chartSpecForPanel(panel)` — `ResultPanel` → `ChartSpec` (series, axes, histogram bins)
- `chart-data.ts` — pivot panel specs into renderer-friendly row shapes
- `theme.ts` — palette, margins, font defaults

Pure logic only — no SolidJS or Observable Plot.

## Web renderer

`apps/studio/web/src/result/result-panels-grid.tsx` renders chart specs with Observable Plot
through `ResultPanelsGridView`. The renderer and its data-loading atoms are owned by Studio;
`@lisca/ui` does not depend on the analysis model or renderer.

## Rust pipeline

Native analysis pipeline in `crates/lisca/src/analysis/`. ROI stacks under `roi/` come from **Studio crop**
or CLI (`lisca-crop`; Python crop in `../pyama-v2`) — not from the light Aligner shell. The running workflow
depends on `assay.json` → root `type`:

| Assay             | Goal source (not implementation reference)                                                   | Pipeline                                        |
| ----------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `transfection` | sibling [`lisca-transfection-assay`](../../../lisca-transfection-assay) — stages, CSV columns, plot names | segment → timeseries → AUC → fit (+ plots)      |
| `killing`  | [mupattern](https://github.com/keejkrej/mupattern) / future `lisca-killing-assay` — kill curve semantics, ResNet classifier | predict → plot-timeseries → clean → death times → kill curve plot |

Numeric stages and PNG plots run in Rust via [**mplot-rs**](https://github.com/keejkrej/mplot-rs). Killing inference uses ONNX Runtime (`ort`) with the `keejkrej/killing-assay-resnet18` model.

**Python-first → Rust prod process, tolerances, and assay map:** [`parity.md`](./parity.md). Agent workflow: `/lisca-parity`.

## Design stance

Sibling **goal sources** (`lisca-*-assay` packages, mupattern) describe **what** to compute and **which files** to read/write. They are **not** Rust implementation references — do not mirror their NumPy loops, module layout, or Python packaging. Full rules: [`parity.md`](./parity.md).

Rust should be idiomatic for this crate:

- Shared ROI math in `array.rs` (`ndarray`, `ndarray-stats`) and segmentation via `ndarray-ndimage` + `imageproc` (Otsu).
- Per-assay pipelines under `assays/<name>/`.
- Parity is judged on **workspace outputs and scientific meaning** (tolerances in tests), not on matching Python evaluation order or data structures.

## Transfection pipeline

Order matches `transfection pipeline` / `lisca-analyze pipeline`:

```
assay.json → segment → timeseries → plot-timeseries → auc → plot-auc → fit → plot-fit → CSV/XLSX outputs
```

Progress stages (HTTP/WS contract): `preparing → segment → timeseries → auc → fit → completed`.

Plot steps run between their corresponding table stages but do not emit separate progress events.

## Killing pipeline

Ports the mupattern kill workflow (predict → clean → plot) to Studio ROI stacks (`roi/PosN/` TIFF stacks, not crops.zarr):

```
assay.json → predict (ResNet ONNX, P(dead) per frame) → plot-timeseries → clean (monotonicity) → death times → plot kill curve
```

Progress reuses the same HTTP stage names with kill-specific messages:

| Stage        | Kill step                                |
| ------------ | ---------------------------------------- |
| `preparing`  | Resolve ONNX model + slide mapping       |
| `segment`    | P(dead) inference per ROI frame          |
| `timeseries` | Monotonicity clean                       |
| `auc`        | Death times + kill curve table           |
| `fit`        | P(dead) trace + kill curve PNGs          |

### Kill model path

Set `LISCA_KILL_MODEL` to a directory containing `model.onnx`, or place the exported ONNX model at `workspace/models/killing-assay-resnet18/model.onnx`. Export from Hugging Face:

```sh
uv run optimum-cli export onnx --model keejkrej/killing-assay-resnet18 ./models/killing-assay-resnet18
```

### Killing outputs

| Path                              | Role                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| `timeseries/Pos{n}/ch{n}.csv`      | Per-ROI `P(dead)` vs time (`pos, roi, t, p_dead`)             |
| `results/predictions.csv`         | Raw `(t, crop, p_dead, label, pos, slide_channel)` from ResNet |
| `results/predictions_cleaned.csv` | Monotonicity-enforced labels                                  |
| `results/kill_curve.csv`          | `N(alive)` vs time per slide channel                          |
| `results/death_times.csv`         | Per-ROI death frame (`≥80%` true span, mupattern clean logic) |
| `results/traces.png`, `results/traces_shared_y.png` | P(dead) trace grids                           |
| `results/kill_curve.png`          | N(alive) curve plot                                           |
| `results/death_times.png`         | T_death histogram per slide channel                           |

## Workspace I/O

| Path                                                                         | Role                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `assay.json`                                                                 | Nested domain contract (`type`, `data`, `workspace`, `interval`, `samples`, optional `analysis` with `channels` / `sampleChannels`) |
| `roi/PosN/`                                                                  | Cropped ROI stacks + slim `index.json` (always `axisOrder: TCZYX`; keep `zCount`; derive stack shape from counts + `bbox`; optional `timeIndices`) |
| `mask/PosN/`                                                                 | Per-frame segmentation masks (`uint8` TIFF stacks)     |
| `timeseries/Pos{n}/ch{n}.csv`                                                 | Per-position intensity metrics (`roi,t,area,background,sum,corrected`; no `pos` / `slide_channel`; `t` from `timeIndices`). Segmented: mask fg + **median** bg; `analysis.skipSegment`: whole ROI + **10th-percentile** bg. |
| `results/auc.csv`                                                            | Trapezoidal AUC per `(pos, roi)` trace (+ `.xlsx`)     |
| `results/fit.csv`                                                            | Two-exponential kinetic fit parameters (+ `.xlsx`)     |
| `results/traces.png`, `traces_shared_y.png`, `area.png`, `area_shared_y.png` | Timeseries plots                                       |
| `results/auc.png`, `results/auc_log.png`                                      | AUC boxplots (linear and log y-scale)                  |
| `results/{parameter}.png`, `results/traces_fit.png`, `traces_fit_shared_y.png` | Fit parameter boxplots and fitted trace grids (per-panel + shared y) |

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
  assays.rs            # match assay type → pipeline
  assays/
    transfection.rs + transfection/
      traces.rs        # shared timeseries CSV grouping for AUC/fit/plots
    killing.rs + killing/
```

| Module                                 | Goal                                                         |
| -------------------------------------- | ------------------------------------------------------------ |
| `assays/transfection/segment.rs`    | Otsu mask per ROI frame                                      |
| `assays/transfection/timeseries.rs` | Mask-corrected intensity traces → `timeseries/` CSVs         |
| `assays/transfection/auc.rs`        | Trapezoidal AUC per trace                                    |
| `assays/transfection/fit.rs`        | Two-exponential kinetic fit                                  |
| `assays/transfection/plot/`         | PNGs for traces, AUC, fit parameters                         |
| `assays/killing/`               | ResNet presence, monotonicity clean, death times, kill curve |

Adding a new assay type: create `assays/<name>.rs` plus `assays/<name>/`, implement `run` (async) and optionally `run_sync`, then register in `assays.rs`.

## Plot runtime

Plots render natively in Rust (no Python sidecar). Figure layout constants match transfection (`12×8` in, log-scale AUC boxplot, fluor trace colors, etc.).

## Parity expectations (outputs, not code)

Summary — full process, tolerances table, and lifecycle in [`parity.md`](./parity.md):

- **Contract parity**: `assay.json` semantics, output paths, CSV column names, PNG filenames Studio expects.
- **Scientific parity**: same definitions (e.g. corrected = intensity − area × background; trapezoidal AUC; kill monotonicity clean).
- **Not required**: matching Python module names, NumPy vs loop structure, or bitwise float identity.
- Position ranges in `assay.json` use **inclusive** Studio semantics (`1:12` → positions 1…12).
- Segmentation defaults: `variation_radius=2`, `gaussian_sigma=1.0`.
- Fit uses the two-pass pooled-protein strategy on the **basic translation–degradation model** (onset time \(t_0\), expression rate \(m_0 k_{TL}\), mRNA/protein lifetimes; **no maturation**). Optional `analysis.maxOnsetMinutes` in `assay.json` is **transfection-only** (default **`120`** when omitted for that assay; set `0` to fix onset at 0). Other assays ignore it. Code, CSV, and UI use one set of names: `onset_time`, `expression_rate`, `baseline_intensity` (no alternate aliases).
- Frame interval (`interval.value` / `interval.unit`) is **general**. Transfection defaults to **10 minutes** when omitted; other assays require an explicit positive interval. Optional `analysis.skipSegment` skips Otsu and uses full-ROI p10 background.
- Channel indices live under `analysis`, not on sample rows: `analysis.channels.{mask,signal}` (default) and optional `analysis.sampleChannels[]` overrides keyed by `slideChannel` (int). `signal` is a non-empty int list (one timeseries CSV per channel). Samples keep `slideChannel` (int), `name`, `positions` only.

## Parity CLI (`lisca-analyze`)

Rust stage CLI shaped like sibling [`lisca-transfection-assay`](../../../lisca-transfection-assay) so the same workspace can be driven from either side. Process and side-by-side recipe: [`parity.md`](./parity.md).

```sh
cargo build -p lisca --release --bin lisca-analyze

# Stage commands (mirror transfection CLI; mapping from assay.json)
./target/release/lisca-analyze segment ~/data/TF84
./target/release/lisca-analyze timeseries ~/data/TF84
./target/release/lisca-analyze auc ~/data/TF84
./target/release/lisca-analyze fit ~/data/TF84
./target/release/lisca-analyze plot-timeseries ~/data/TF84
./target/release/lisca-analyze plot-auc ~/data/TF84
./target/release/lisca-analyze plot-fit ~/data/TF84

# Full pipeline from assay.json
./target/release/lisca-analyze pipeline ~/data/TF84
```

`--interval` / `--max-onset-minutes` may be omitted when `assay.json` has `interval` and optional `analysis.maxOnsetMinutes`. `--assay` defaults to `<workspace>/assay.json`. Plot commands also accept transfection-style paths (`…/timeseries`, `…/results/auc.csv`, `…/results/fit.csv`).

## Tests

```sh
cargo test -p lisca
cargo test -p lisca --test transfection_parity -- --ignored   # needs sibling assay + uv
```

Unit tests live under each `analysis/` submodule. Integration tests in `crates/lisca/tests/transfection_parity.rs` build a minimal synthetic workspace and compare stages to transfection reference formulas. Tolerances and ignored Python e2e: [`parity.md`](./parity.md).