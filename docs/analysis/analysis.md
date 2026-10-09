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
Survival (killing).

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
| `killing`      | [mupattern](https://github.com/keejkrej/mupattern) / future `lisca-killing-assay` — kill curve semantics, ResNet classifier   | predict → plot-traces → clean → death times → kill curve plot                                  |

Numeric stages and PNG plots for transfection run in the imported
[`lisca-transfection`](https://github.com/keejkrej/lisca-transfection-assay) crate
via [**mplot-rs**](https://github.com/keejkrej/mplot-rs). Killing inference uses ONNX Runtime (`ort`) with Hugging Face `keejkrej/killing-assay-resnet18` (local cache or `LISCA_KILL_MODEL`; not shipped in the installer, and not a product `models/` brain).

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
- Killing: per-assay code under `assays/killing/`. Weights: HF
  `keejkrej/killing-assay-resnet18`, local cache or `LISCA_KILL_MODEL`. Desktop
  installers do not bundle the ONNX.
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

Ports the mupattern kill workflow (predict → clean → plot) to Studio ROI stacks (`roi/PosN/` TIFF stacks, not crops.zarr):

```
assay.json → predict (ResNet ONNX, P(dead) per frame) → plot-traces → clean (monotonicity) → death times → plot kill curve
```

Steps: `analysis/killing/predict/Pos{n}` (one per Position), then
`analysis/killing/plot-traces`, clean, and the kill curve / death time plots.

Progress reuses the same HTTP stage names with kill-specific messages:

| Stage       | Kill step                           |
| ----------- | ----------------------------------- |
| `preparing` | Resolve ONNX model + sample mapping |
| `segment`   | P(dead) inference per ROI frame     |
| `traces`    | Monotonicity clean                  |
| `auc`       | Death times + kill curve table      |
| `fit`       | P(dead) trace + kill curve PNGs     |

### Kill model path

The classifier is Hugging Face [`keejkrej/killing-assay-resnet18`](https://huggingface.co/keejkrej/killing-assay-resnet18)
(killing-assay owned). This repo does **not** treat it as a product model, and
Studio installers do **not** ship the ONNX. Set `LISCA_KILL_MODEL` to a directory
containing `model.onnx`, or place that file in the workspace cache
`models/killing-assay-resnet18/`. That cache is not a second weights tree.
Local download:

```sh
curl -fL --retry 3 --retry-delay 2 \
  "https://huggingface.co/keejkrej/killing-assay-resnet18/resolve/main/model.onnx" \
  -o ./models/killing-assay-resnet18/model.onnx
```

### Remote label-free viability

The Analysis page can also call the inference host in this repo
([install](./inference-server.md)). The host loads EmbeddingGemma and the
viable/dead classifier from
[`lisca-killing-assay`](https://github.com/keejkrej/lisca-killing-assay). Studio
sends movies on a separate private connection. See
[ADR-0008](../adr/0008-inference-host-loads-assay-models.md). The ResNet pipeline
above is unchanged.

### Killing outputs

| Path                                                | Role                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| `traces/Pos{n}/ch{m}.csv`                           | Per-ROI `P(dead)` Trace (`roi, t, p_dead`)                              |
| `results/predictions.csv`                           | Raw `t, crop, p_dead, label, pos, sample` from ResNet                   |
| `results/predictions_cleaned.csv`                   | Monotonicity-enforced labels (`t, crop, label, pos, sample`)            |
| `results/kill_curve.csv`                            | `N(alive)` vs time per Sample (`t, n_alive, sample`)                    |
| `results/death_times.csv`                           | Per-ROI death frame (`crop, death_time, pos, sample`; `≥80%` true span) |
| `results/traces.png`, `results/traces_shared_y.png` | P(dead) trace grids                                                     |
| `results/kill_curve.png`                            | N(alive) curve plot                                                     |
| `results/death_times.png`                           | T_death histogram per Sample                                            |

`sample` is the Sample name (`samples[].name` in `assay.json`). Older killing
Workspaces wrote `timeseries/Pos{n}/`; the `killing_traces_dir` migration renames
it to `traces/` on open (see [Workspace migrations](#workspace-migrations)).

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
| `analysis/` / `results/` | Shared folder names. Table columns: [`schema.md`](./schema.md). Killing tables stay in-tree until that sidecar exists.              |

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
