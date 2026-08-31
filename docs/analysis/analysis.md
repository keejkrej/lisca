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

## Result gallery

`apps/studio/web/src/result/result-panels-grid.tsx` shows the PNG files the Rust
pipeline already wrote via mplot-rs (`ResultPlotGallery`). There is no in-app chart
renderer. Studio lists PNGs from the analysis manifest (`results/*.png` workspace
boxplots and `results/<sample>/*.png` packs) and serves them at `GET /fs/file?path=`.
Per-sample titles include the sample folder (for example
`Intensity traces (A431_aiLNP)`).

Sections stay assay-aware: Timeseries / Parameters (transfection) vs Timeseries /
Survival (killing).

## Analysis demo

`apps/studio/demo` is a browser-only mock of the result page. It loads fixture PNGs
for both shipping assays so the team can iterate on the gallery without a workspace.

```sh
vp run dev:studio-demo
```

Opens [http://localhost:5177](http://localhost:5177). Switch `transfection.fixture` /
`killing.fixture` in the navbar. See `apps/studio/demo/README.md`.

## Workspace fixtures (e2e / agents)

`@lisca/fixtures` writes a real on-disk source folder or workspace so tests and
agents can skip earlier pipeline steps. This is separate from the analysis demo
PNGs above.

```sh
# Only test analysis
vp run fixture:workspace -- --assay transfection --stage cropped --out /tmp/tf-analyze

# Only test align
vp run fixture:workspace -- --assay killing --stage assay --out /tmp/kill-align
```

Stages: `source`, `assay`, `aligned`, `cropped`, `annotated`, `analyzed`.
See `packages/fixtures/README.md`.

## Rust pipeline

Native analysis pipeline in `crates/lisca/src/analysis/` plus git crates for
mature assays. ROI stacks under `roi/` come from **Studio crop**, CLI (`lisca-crop`),
or the notebooks zip (`lisca.services.crop` in `python/`) — not from the light Aligner shell. The running workflow
depends on `assay.json` → root `type`:

| Assay          | Goal source (not implementation reference)                                                                                    | Pipeline                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `transfection` | [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay) — Python + Rust crate imported via git URL | segment → timeseries → AUC → fit (+ plots) in `lisca-transfection`; Studio ONNX segment stays here |
| `killing`      | [mupattern](https://github.com/keejkrej/mupattern) / future `lisca-killing-assay` — kill curve semantics, ResNet classifier   | predict → plot-timeseries → clean → death times → kill curve plot                                  |

Numeric stages and PNG plots for transfection run in the imported
[`lisca-transfection`](https://github.com/keejkrej/lisca-transfection-assay) crate
via [**mplot-rs**](https://github.com/keejkrej/mplot-rs). Killing inference uses ONNX Runtime (`ort`) with Hugging Face `keejkrej/killing-assay-resnet18` (curl at Studio package time; not a product `models/` brain).

**Python-first → imported crate process, tolerances, and assay map:** [`parity.md`](./parity.md). Transfection Python+Rust parity lives in the sidecar (`docs/parity.md` there). Agent workflow: `/lisca-parity`.

## Design stance

Sibling **goal sources** (`lisca-*-assay` packages, mupattern) describe **what** to compute and **which files** to read/write. Mature transfection analysis is **imported** from `lisca-transfection-assay` (git crate + Python package). Killing remains in-tree until its sidecar exists.

Rust in this crate should stay idiomatic:

- Shared ROI I/O in `roi_stack.rs` / `csv_io.rs`; crop in `lisca-crop`.
- Transfection stages: call `lisca-transfection` (Otsu, timeseries, AUC, fit, plots). Do not keep a second full pipeline under `assays/transfection/`.
- Product Smart exclude / Smart segment models stay in `models/`. Transfection
  ONNX segment may stay as a Studio adapter (`segment_onnx.rs` + `ort`) until
  the sidecar un-stubs it; resolve `keejkrej/single-cell-pattern-unet` via
  `LISCA_PATTERN_SEG_MODEL`, not as a lisca-owned assay brain.
- Killing: per-assay code under `assays/killing/`. Weights: HF
  `keejkrej/killing-assay-resnet18`, curl at package time.
- Parity for transfection is judged in the sidecar; this repo’s wrapper tests check the dispatch still writes the workspace contract.

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

| Stage        | Kill step                          |
| ------------ | ---------------------------------- |
| `preparing`  | Resolve ONNX model + slide mapping |
| `segment`    | P(dead) inference per ROI frame    |
| `timeseries` | Monotonicity clean                 |
| `auc`        | Death times + kill curve table     |
| `fit`        | P(dead) trace + kill curve PNGs    |

### Kill model path

The classifier is Hugging Face [`keejkrej/killing-assay-resnet18`](https://huggingface.co/keejkrej/killing-assay-resnet18)
(killing-assay owned). This repo does **not** treat it as a product model;
Studio **curls the ONNX at package time** into `models/killing-assay-resnet18/`
(see `.github/workflows/release.yml`). Set `LISCA_KILL_MODEL` to a directory
containing `model.onnx`, or use the packaged resource next to the bundled
server. Workspace-local `models/killing-assay-resnet18/` is a cache, not a
second weights tree. Package-time download:

```sh
curl -fL --retry 3 --retry-delay 2 \
  "https://huggingface.co/keejkrej/killing-assay-resnet18/resolve/main/model.onnx" \
  -o ./models/killing-assay-resnet18/model.onnx
```

### Killing outputs

| Path                                                | Role                                                           |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `timeseries/Pos{n}/ch{n}.csv`                       | Per-ROI `P(dead)` vs time (`pos, roi, t, p_dead`)              |
| `results/predictions.csv`                           | Raw `(t, crop, p_dead, label, pos, slide_channel)` from ResNet |
| `results/predictions_cleaned.csv`                   | Monotonicity-enforced labels                                   |
| `results/kill_curve.csv`                            | `N(alive)` vs time per slide channel                           |
| `results/death_times.csv`                           | Per-ROI death frame (`≥80%` true span, mupattern clean logic)  |
| `results/traces.png`, `results/traces_shared_y.png` | P(dead) trace grids                                            |
| `results/kill_curve.png`                            | N(alive) curve plot                                            |
| `results/death_times.png`                           | T_death histogram per slide channel                            |

## Workspace I/O

| Path                                                                                                                              | Role                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assay.json`                                                                                                                      | Nested domain contract (`type`, `data`, `workspace`, `interval`, `samples`, optional `analysis` with `channels` / `sampleChannels`)                                                                                                                                                                                                                                             |
| `roi/PosN/`                                                                                                                       | Cropped ROI stacks + slim `index.json` (always `axisOrder: TCZYX`; keep `zCount`; derive stack shape from counts + `bbox`; optional `timeIndices`)                                                                                                                                                                                                                              |
| `mask/PosN/`                                                                                                                      | Per-frame segmentation masks (`uint8` TIFF stacks)                                                                                                                                                                                                                                                                                                                              |
| `analysis/Pos{n}/ch{n}.csv`                                                                                                       | Per-position intensity metrics (`roi,t,area,background,sum,corrected`; no `pos` / `slide_channel`; `t` from `timeIndices`). Segmented: mask fg + **median** bg; `analysis.skipSegment`: whole ROI + **10th-percentile** bg. CSV only.                                                                                                                                           |
| `analysis/Pos{n}/auc.csv`                                                                                                         | Trapezoidal AUC per ROI (`roi,auc`; `channel` only when that Pos has multiple signal CSVs). `pos` is the folder name.                                                                                                                                                                                                                                                           |
| `analysis/Pos{n}/fit.csv`                                                                                                         | Two-exponential kinetic fit parameters (`roi,…`; same channel rule).                                                                                                                                                                                                                                                                                                            |
| `results/<sample>/`                                                                                                               | Per-sample packs: `traces.xlsx` / `auc.xlsx` / `fit.xlsx` plus `traces.png`, `traces_shared_y.png`, `traces_summary.png`, `traces_summary_shared_y.png`, `area.png`, `area_shared_y.png`, `traces_fit.png`, `traces_fit_shared_y.png`, `expression_rate_vs_onset_time.png`, `expression_rate_vs_mrna_lifetime.png`. No `*_log` or `area_summary`. No shared-y for the scatters. |
| `results/auc.png`, `expression_rate.png`, `onset_time.png`, `baseline_intensity.png`, `protein_lifetime.png`, `mrna_lifetime.png` | Cross-sample parameter boxplots (samples on x)                                                                                                                                                                                                                                                                                                                                  |

There is no `timeseries/` folder for transfection, no combined results tables, and no CSV under `results/`. Studio results UI displays these PNG files; it does not re-render plots from CSVs.

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
    transfection.rs + transfection/   # thin dispatch + local ONNX segment
      mapping.rs       # lisca SlideMapping → lisca-transfection mapping
      segment.rs       # Otsu → git crate; ONNX adapter stays here (HF weights)
      segment_onnx.rs  # Studio ONNX adapter (`LISCA_PATTERN_SEG_MODEL` / HF)
    killing.rs + killing/
```

| Module                                | Goal                                                            |
| ------------------------------------- | --------------------------------------------------------------- |
| `assays/transfection/`                | Dispatch into `lisca-transfection`; Studio ONNX adapter         |
| `assays/transfection/segment_onnx.rs` | Studio ONNX adapter; weights via `LISCA_PATTERN_SEG_MODEL` / HF |
| `lisca-transfection` (git)            | Otsu, timeseries, AUC, kinetic fit, plots                       |
| `assays/killing/`                     | ResNet presence, monotonicity clean, death times, kill curve    |

Adding a new assay type: create `assays/<name>.rs` plus `assays/<name>/`, implement `run` (async) and optionally `run_sync`, then register in `assays.rs`.

## Plot runtime

Plots render natively in Rust (no Python sidecar). Figure layout constants match transfection (`12×8` in, log-scale AUC boxplot, fluor trace colors, etc.).

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

- Fit uses the two-pass pooled-protein strategy on the **basic translation–degradation model** (onset time \(t*0\), expression rate \(m_0 k*{TL}\), mRNA/protein lifetimes; **no maturation**). Optional `analysis.maxOnsetMinutes` in `assay.json` is **transfection-only** (default **`120`** when omitted for that assay; set `0` to fix onset at 0). Other assays ignore it. Code, CSV, and UI use one set of names: `onset_time`, `expression_rate`, `baseline_intensity` (no alternate aliases).
- Frame interval (`interval.value` / `interval.unit`) is **general**. Transfection defaults to **10 minutes** when omitted; other assays require an explicit positive interval. Optional `analysis.skipSegment` skips Otsu and uses full-ROI p10 background.
- Channel indices live under `analysis`, not on sample rows: `analysis.channels.{mask,signal}` (default) and optional `analysis.sampleChannels[]` overrides keyed by `slideChannel` (int). `signal` is a non-empty int list (one timeseries CSV per channel). Samples keep `slideChannel` (int), `name`, `positions` only.

## Parity CLI (`lisca-analyze`)

Rust stage CLI shaped like sibling [`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay) so the same workspace can be driven from either side. `lisca-analyze` calls the git crate (plus local ONNX segment). Process and side-by-side recipe: [`parity.md`](./parity.md).

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

`--interval` / `--max-onset-minutes` may be omitted when `assay.json` has `interval` and optional `analysis.maxOnsetMinutes`. `--assay` defaults to `<workspace>/assay.json`. Plot commands also accept transfection-style paths (`…/analysis`, `…/analysis/PosN/auc.csv`, `…/analysis/PosN/fit.csv`).

## Tests

```sh
cargo test -p lisca
cargo test -p lisca --test transfection_parity -- --ignored   # needs sibling assay + uv
```

Unit tests live under each `analysis/` submodule. Integration tests in `crates/lisca/tests/transfection_parity.rs` build a minimal synthetic workspace and compare stages to transfection reference formulas. Tolerances and ignored Python e2e: [`parity.md`](./parity.md).
