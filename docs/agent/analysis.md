# Studio analysis (Rust)

Native analysis pipeline in `crates/lisca/src/analysis/`. Ports the reference algorithms from the sibling [`transfection`](../../transfection) Python package. Numeric stages (segment, timeseries, AUC, fit) run in Rust; PNG plots use **plotpy** (matplotlib via a bundled or system Python interpreter).

## Pipeline

Order matches `transfection-analyze.sh`:

```
assay.json → slide.json → segment → timeseries → plot-timeseries → auc → plot-auc → fit → plot-fit → CSV/XLSX outputs
```

Progress stages (HTTP/WS contract): `preparing → segment → timeseries → auc → fit → completed`.

Plot steps run between their corresponding table stages but do not emit separate progress events.

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

| Module | transfection reference |
| --- | --- |
| `slide.rs` | `core/slide.py` + assay mapping |
| `roi_stack.rs` | `core/roi.py`, `core/mask.py` |
| `image_ops.rs` | `core/segment.py` filters |
| `segment.rs` | `services/segment.py` |
| `metrics.rs` | `core/metrics.py` |
| `timeseries.rs` | `services/timeseries.py` |
| `auc.rs` | `services/auc.py` |
| `fit.rs` | `services/fit.py` |
| `export.rs` | `core/export.py` (parallel `.xlsx` sidecars) |
| `plot/` | `services/plot_*.py` via plotpy/matplotlib |
| `pipeline.rs` | orchestration |

## Plot runtime (Electron)

Plotpy invokes Python 3 + matplotlib. No separate transfection install is required.

| Context | Python resolution |
| --- | --- |
| Packaged Electron app | `LISCA_PYTHON` → `resources/python/bin/python3` (or `python.exe` on Windows) when bundled |
| Development | `LISCA_PYTHON` env var, else `python3` on `PATH` |

Packaging must ship a standalone Python with matplotlib (and numpy) under `resources/python/`. Figure layout constants match transfection (`12×8` in, log-scale AUC boxplot, fluor trace colors, etc.).

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
