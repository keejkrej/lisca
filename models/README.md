# Models in this monorepo

`models/` holds **product / any-assay** tools that Studio and Annotator share.
Assay-specific analysis brains live in assay sidecars and on Hugging Face.
Do not add assay-specific weights here.

| Directory                                                      | Role                                 | Ownership                                                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`smart-segment-slimsam`](./smart-segment-slimsam/README.md)   | Smart segment (click-prompted masks) | **This repo** (product)                                                                                                                                                                               |
| [`mupattern-resnet18`](./mupattern-resnet18/README.md)         | Former killing classifier            | **This repo**, legacy reference only                                                                                                                                                                  |
| [`killing-assay-resnet18`](./killing-assay-resnet18/README.md) | Killing presence classifier          | **Not lisca-owned.** Killing assay / HF [`keejkrej/killing-assay-resnet18`](https://huggingface.co/keejkrej/killing-assay-resnet18). Local cache or `LISCA_KILL_MODEL`. Not shipped in the installer. |

ONNX weights (`*_quantized.onnx` / `model.onnx`) are gitignored and stay out of
desktop installers (`scripts/package-tauri.ts`). On first use of Smart segment
when no local checkout or `LISCA_SMART_SEGMENT_MODEL` override is present, the
Rust server downloads and caches the public quantized SlimSAM ONNX weights under
`<config_dir>/models/` (`Xenova/slimsam-77-uniform`; see
[ADR-0026](../docs/adr/0026-on-demand-smart-model-cache.md)). Crop (`lisca-crop`)
stays in this repo and does not live under `models/`.
