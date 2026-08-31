# lisca Python package

Utilities for dataset building and model training used by the Lisca monorepo.

## Setup

```sh
cd python
uv sync                 # runtime + dev
uv sync --extra analysis  # + transfection git package (Python 3.12+)
uv sync --group train   # + torch / lightning / onnx / cellpose
# or labeling only:
uv sync --group label
```

CLI entry point: `uv run lisca …`

## Commands

### Smart exclusion (existing)

```sh
uv run lisca dataset create-smart-exclusion --workspace … --source … --output …
uv run lisca dataset train-smart-exclusion --dataset … --output …
```

### Single-cell pattern fg/bg segmentation

Teacher (Cellpose v4 **cpsam**) → train/val pairs → small U-Net → ONNX for
`lisca-analyze segment --backend onnx`.

Published model: [keejkrej/single-cell-pattern-unet](https://huggingface.co/keejkrej/single-cell-pattern-unet)

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

# 4) Package
cp ~/data/TF84/ge_seg_runs/<timestamp>/model.onnx \
  ../models/single-cell-pattern-unet/onnx/model.onnx
cp ~/data/TF84/ge_seg_runs/<timestamp>/export_meta.json \
  ../models/single-cell-pattern-unet/export_meta.json
```

Rust inference:

```sh
export LISCA_PATTERN_SEG_MODEL=../models/single-cell-pattern-unet/onnx
../target/release/lisca-analyze segment ~/data/TF84 --backend onnx --force
```

See `../models/single-cell-pattern-unet/README.md` and
`../docs/analysis/analysis.md`.

## Tests

```sh
uv run pytest
```
