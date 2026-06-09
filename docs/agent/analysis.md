# Studio analysis (Rust)

Native analysis pipeline in `crates/lisca/src/analysis/`. The running workflow depends on `assay.json` → `assayId`:

| Assay | Reference | Pipeline |
| --- | --- | --- |
| `gene-expression` | sibling [`transfection`](../../transfection) Python package | segment → timeseries → AUC → fit (+ plots) |
| `immune-killing` | [mupattern](https://github.com/keejkrej/mupattern) kill ResNet classifier | predict → clean → death times → kill curve plot |

Numeric stages and PNG plots run in Rust via [**mplot-rs**](https://github.com/keejkrej/mplot-rs). Immune killing inference uses ONNX Runtime (`ort`) with the `keejkrej/mupattern-resnet18` model.

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

| Stage | Kill step |
| --- | --- |
| `preparing` | Resolve ONNX model + slide mapping |
| `segment` | Cell presence inference |
| `timeseries` | Monotonicity clean |
| `auc` | Death times + kill curve table |
| `fit` | Kill curve PNG |

### Kill model path

Set `LISCA_KILL_MODEL` to a directory containing `model.onnx`, or place the exported ONNX model at `workspace/models/mupattern-resnet18/model.onnx`. Export from Hugging Face:

```sh
uv run optimum-cli export onnx --model keejkrej/mupattern-resnet18 ./models/mupattern-resnet18
```

### Immune killing outputs

| Path | Role |
| --- | --- |
| `results/predictions.csv` | Raw `(t, crop, label, pos, slide_channel)` from ResNet |
| `results/predictions_cleaned.csv` | Monotonicity-enforced labels |
| `results/death_times.csv` | Per-ROI death frame (`≥80%` true span, mupattern clean logic) |
| `results/kill_curve.csv` | `n_alive` vs time per slide channel |
| `results/kill_curve.png` | Kill curve plot |

## Workspace I/O

| Path | Role |
| --- | --- |
| `assay.json` | Input contract from Studio basic info |
| `slide.json` | Snake-case slide channel mapping (transfection format) |
| `roi/PosN/` | Cropped ROI stacks + `index.json` (`axisOrder: TCZYX`) |
| `mask/PosN/` | Per-frame segmentation masks (`uint8` TIFF stacks) |
| `timeseries/sc{S}_ch{C}.csv` | Mask-corrected intensity metrics (+ parallel `.xlsx`) |
| `results/auc.csv` | Trapezoidal AUC per `(pos, roi)` trace (+ `.xlsx`) |
| `results/fit.csv` | Two-exponential kinetic fit parameters (+ `.xlsx`) |
| `results/traces.png`, `traces_shared_y.png`, `area.png`, `area_shared_y.png` | Timeseries plots |
| `results/auc.png` | AUC boxplot |
| `results/{parameter}.png`, `results/traces_fit.png` | Fit parameter boxplots and fitted trace grid |

Studio results UI reads CSVs for interactive charts; PNG filenames match transfection output.

## Module map

```
analysis/
  pipeline.rs          # load assay.json, dispatch
  progress.rs          # shared progress + spawn_blocking helper
  slide.rs             # slide channel mapping (shared)
  roi_stack.rs         # ROI TIFF stacks (shared)
  csv_io.rs, output.rs, export.rs
  plot/                # shared mplot-rs helpers
  assays/
    mod.rs             # match assayId → pipeline
    gene_expression/   # transfection-style pipeline
    immune_killing/    # mupattern ResNet kill pipeline
```

| Module | transfection / mupattern reference |
| --- | --- |
| `assays/gene_expression/segment.rs` | `services/segment.py` |
| `assays/gene_expression/timeseries.rs` | `services/timeseries.py` |
| `assays/gene_expression/auc.rs` | `services/auc.py` |
| `assays/gene_expression/fit.rs` | `services/fit.py` |
| `assays/gene_expression/plot/` | `services/plot_*.py` via mplot-rs |
| `assays/immune_killing/` | mupattern `kill` (predict, clean, plot) |

Adding a new assay type: create `assays/<name>/` with `run` (async) and optionally `run_sync`, then register in `assays/mod.rs`.

## Plot runtime

Plots render natively in Rust (no Python sidecar). Figure layout constants match transfection (`12×8` in, log-scale AUC boxplot, fluor trace colors, etc.).

## Parity expectations

- Position ranges in `assay.json` use **inclusive** Studio semantics (`1:12` → positions 1…12); expanded to explicit lists in `slide.json`.
- Segmentation defaults: `variation_radius=2`, `gaussian_sigma=1.0`.
- Fit uses the two-pass pooled-protein strategy with `max_onset_minutes=0` unless extended later.
- Float CSV values may differ slightly from Python due to evaluation order; tests use tolerance, not bitwise equality.

## Tests

```sh
cargo test -p lisca
```

Unit tests live under each `analysis/` submodule. Optional golden parity against transfection can be added when a shared fixture workspace exists.
