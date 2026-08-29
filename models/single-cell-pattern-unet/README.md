---
license: mit
tags:
  - image-segmentation
  - onnx
  - biology
  - microscopy
  - cell-segmentation
  - micropattern
pipeline_tag: image-segmentation
library_name: onnx
---

# Single-cell pattern U-Net

Small dense **foreground / background** segmenter for **LISCA micropattern**
brightfield ROI crops (~128×128 single-cell sites).

Use it whenever you need a binary cell mask on a patterned site (gene-expression
intensity, binding overlays, etc.) without running full Cellpose cpsam.

Published as: **[keejkrej/single-cell-pattern-unet](https://huggingface.co/keejkrej/single-cell-pattern-unet)**

## Why not full Cellpose cpsam?

cpsam (ViT-L, ~304M) is excellent as a **teacher** for pseudo-labels, but
production masks only need binary foreground for intensity / area metrics.
This student U-Net (~1.9M params, ~7.4 MB ONNX) is distilled from cpsam labels
on in-house TF84 BF frames.

Teacher weights are CC-BY-NC; this student is trained on your images only.

## Files

```text
onnx/model.onnx       # inference graph (gitignored; download from HF)
export_meta.json      # preprocess / postprocess contract
README.md
```

## Metrics (TF84 hold-out positions)

| Split | Samples |        Best val Dice |
| ----- | ------: | -------------------: |
| train |  41,548 |                    — |
| val   |   6,990 | **0.888** (epoch 18) |

Teacher: Cellpose v4 **cpsam**, time stride 20, empty masks dropped
(`fg < 0.1%`).

## Preprocess / postprocess

Matches `export_meta.json`:

1. Min–max normalize BF crop → uint8
2. Resize to 128×128
3. Grayscale → RGB, ImageNet mean/std
4. ONNX `logits` `(N,1,128,128)` → sigmoid ≥ 0.5
5. Nearest resize to original H×W, hole fill

### ONNX I/O

|        | Name           | Shape                      |
| ------ | -------------- | -------------------------- |
| input  | `pixel_values` | `(N, 3, 128, 128)` float32 |
| output | `logits`       | `(N, 1, 128, 128)` float32 |

## Download / inference (lisca Rust)

```sh
huggingface-cli download keejkrej/single-cell-pattern-unet \
  --local-dir ./models/single-cell-pattern-unet

export LISCA_PATTERN_SEG_MODEL=./models/single-cell-pattern-unet/onnx
lisca-analyze segment ~/data/TF84 --backend onnx --force
```

Legacy env alias: `LISCA_GE_SEG_MODEL` is still accepted.

## Train (from `lisca/python`)

```sh
cd python && uv sync --group train

uv run lisca dataset label-cpsam \
  --workspace ~/data/TF84 --output ~/data/TF84/cpsam_labels \
  --channel 0 --time-stride 20

uv run lisca dataset create-gene-expression-seg \
  --labels ~/data/TF84/cpsam_labels --output ~/data/TF84/ge_seg_dataset

uv run lisca dataset train-gene-expression-seg \
  --dataset ~/data/TF84/ge_seg_dataset --output ~/data/TF84/ge_seg_runs \
  --epochs 40 --image-size 128
```

## Env

| Variable                  | Meaning                                                 |
| ------------------------- | ------------------------------------------------------- |
| `LISCA_PATTERN_SEG_MODEL` | Directory containing `model.onnx` (or path to the file) |
| `LISCA_GE_SEG_MODEL`      | Legacy alias for the same                               |
