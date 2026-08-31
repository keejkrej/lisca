# lisca Python package

Utilities for ROI crop, dataset building, and model training used by the Lisca monorepo.

Crop (ND2/CZI → `roi/`) lives here. Transfection analyze/results live in the
[`lisca-transfection-assay`](https://github.com/keejkrej/lisca-transfection-assay)
sidecar — do not import a deprecated `pyama*` package.

## Setup

```sh
cd python
uv sync                 # runtime + dev
uv sync --extra crop      # ND2/CZI readers for `lisca crop` / notebooks
uv sync --extra analysis  # + transfection git package (Python 3.12+)
uv sync --group train   # + torch / lightning / onnx / cellpose
# or labeling only:
uv sync --group label
```

CLI entry point: `uv run lisca …`

## Commands

### Crop (ND2/CZI)

One source pass per position: all `Roi{n}.tif` writers stay open until that Pos
is done. Default is 1 position worker (`LISCA_CROP_WORKERS` to opt into more).
The FD budget shrinks workers rather than re-scanning the source.

```sh
uv run lisca crop --workspace … --source …nd2 --positions 0,1,2
```

### Smart exclusion (existing)

```sh
uv run lisca dataset create-smart-exclusion --workspace … --source … --output …
uv run lisca dataset train-smart-exclusion --dataset … --output …
```

### Single-cell pattern fg/bg segmentation

Teacher (Cellpose v4 **cpsam**) → train/val pairs → small U-Net → ONNX for
`lisca-analyze segment --backend onnx`.

This is a **transfection-assay** brain ([keejkrej/single-cell-pattern-unet](https://huggingface.co/keejkrej/single-cell-pattern-unet)),
not a product model. Point `LISCA_PATTERN_SEG_MODEL` at the exported ONNX (or
`--model-dir`). Do not add new assay-specific weights under `models/`. See
[`../models/README.md`](../models/README.md).

```sh
# 1) Pseudo-label BF ROI frames (resume-safe; writes images/masks + previews)
uv run lisca dataset label-cpsam \
  --workspace ~/data/TF84 \
  --output ~/data/TF84/cpsam_labels \
  --channel 0 \
  --time-stride 20

# Smoke (one position, t=0 only):
uv run lisca dataset label-cpsam \
  --workspace ~/data/TF84 \
  --output ~/data/TF84/cpsam_labels_smoke \
  --positions 63 --times 0

# 2) Materialize train/val with position hold-out (need ≥2 positions)
uv run lisca dataset create-gene-expression-seg \
  --labels ~/data/TF84/cpsam_labels \
  --output ~/data/TF84/ge_seg_dataset

# 3) Train + export ONNX
uv run lisca dataset train-gene-expression-seg \
  --dataset ~/data/TF84/ge_seg_dataset \
  --output ~/data/TF84/ge_seg_runs \
  --epochs 40 --image-size 128

# 4) Point lisca-analyze at the export (do not copy into models/ as ownership)
export LISCA_PATTERN_SEG_MODEL=~/data/TF84/ge_seg_runs/<timestamp>
```

Rust inference from the published HF weights:

```sh
huggingface-cli download keejkrej/single-cell-pattern-unet \
  --local-dir /tmp/single-cell-pattern-unet
export LISCA_PATTERN_SEG_MODEL=/tmp/single-cell-pattern-unet/onnx
../target/release/lisca-analyze segment ~/data/TF84 --backend onnx --force
```

See `../models/single-cell-pattern-unet/README.md` and
`../docs/analysis/analysis.md`.

## Tests

```sh
uv run pytest
```
