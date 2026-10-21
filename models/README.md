# Models in this monorepo

`models/` holds **product / any-assay** tools that Studio and Aligner share.
Assay-specific analysis brains live in assay sidecars and on Hugging Face.
Do not add new assay-specific weights here.

| Directory                                                          | Role                                 | Ownership                                                                                                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`smart-exclusion-resnet18`](./smart-exclusion-resnet18/README.md) | Smart exclude (ROI include/exclude)  | **This repo** (product)                                                                                                                                                              |
| [`smart-segment-slimsam`](./smart-segment-slimsam/README.md)       | Smart segment (click-prompted masks) | **This repo** (product)                                                                                                                                                              |
| [`mupattern-resnet18`](./mupattern-resnet18/README.md)             | Retired local classifier             | **This repo**, legacy reference only. Label-free killing viability uses the inference host, not this directory.                                                                      |
| [`single-cell-pattern-unet`](./single-cell-pattern-unet/README.md) | Gene-expression ROI masks            | **Not lisca-owned.** Transfection assay / HF [`keejkrej/single-cell-pattern-unet`](https://huggingface.co/keejkrej/single-cell-pattern-unet). Resolve via `LISCA_PATTERN_SEG_MODEL`. |

ONNX weights (`model.onnx`) are gitignored and are not copied into desktop
installers. Crop (`lisca-crop`) stays in this repo and does not live under
`models/`. Smart exclude and Smart segment stay in the product for a hosted
service in version 1.0; their weights are not packaged for on-device use.
