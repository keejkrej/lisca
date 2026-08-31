# Models in this monorepo

`models/` holds **product / any-assay** tools that Studio and Aligner share.
Assay-specific analysis brains live in assay sidecars and on Hugging Face.
Do not add new assay-specific weights here.

| Directory                                                          | Role                                 | Ownership                                                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`smart-exclusion-resnet18`](./smart-exclusion-resnet18/README.md) | Smart exclude (ROI include/exclude)  | **This repo** (product)                                                                                                                                                              |
| [`smart-segment-slimsam`](./smart-segment-slimsam/README.md)       | Smart segment (click-prompted masks) | **This repo** (product)                                                                                                                                                              |
| [`mupattern-resnet18`](./mupattern-resnet18/README.md)             | Former killing classifier            | **This repo**, legacy reference only                                                                                                                                                 |
| [`single-cell-pattern-unet`](./single-cell-pattern-unet/README.md) | Gene-expression ROI masks            | **Not lisca-owned.** Transfection assay / HF [`keejkrej/single-cell-pattern-unet`](https://huggingface.co/keejkrej/single-cell-pattern-unet). Resolve via `LISCA_PATTERN_SEG_MODEL`. |
| [`killing-assay-resnet18`](./killing-assay-resnet18/README.md)     | Killing presence classifier          | **Not lisca-owned.** Killing assay / HF [`keejkrej/killing-assay-resnet18`](https://huggingface.co/keejkrej/killing-assay-resnet18). Studio still curls this ONNX at package time.   |

ONNX weights (`model.onnx`) are gitignored. Crop (`lisca-crop`) stays in this
repo and does not live under `models/`.
