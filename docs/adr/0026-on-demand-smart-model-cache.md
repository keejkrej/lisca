# ADR-0026: On-demand Hugging Face cache for Smart segment ONNX weights

- **Status:** accepted
- **Date:** 2026-11-12

## Decision

We will keep Annotate Smart segment (`Xenova/slimsam-77-uniform`, 13.2 MB INT8 quantized) ONNX weights out of desktop installers, download them on first use into `<config_dir>/models/`, and drop experimental Smart exclude and Transfection ONNX segmentation from the app while retaining `python/` dataset and training code, because SlimSAM is the only mature external interactive model and runs fast on CPU via `ort` without inflating installers.

## Why

Bundling ONNX weights inside `src-tauri/resources` inflates every Studio and Annotator installer and auto-update artifact even for users who never invoke interactive segmentation. At the same time, the ResNet18 Smart exclude classifier underperformed classical log-std exclusion on micropattern grids, and Transfection's Otsu local-variation segmenter in `lisca-transfection-assay` is the canonical pipeline backend. Keeping experimental Smart exclude and `segmentationMode` controls in the app added dead routes, contract surface, and model confusion, whereas offline dataset preparation and training scripts in `python/` remain useful for future model experiments.

Resolving `LISCA_SMART_SEGMENT_MODEL` and checkout `models/` first, then caching missing quantized SlimSAM weights atomically (`*.part` → rename) under `<config_dir>/models/` on first invocation, keeps installers at 0 MB model overhead while making Smart segment work out of the box on macOS, Windows, and Linux CPUs. Session state is stored behind a retryable `Mutex<Option<...>>` rather than `OnceLock<Result<...>>` so a transient offline error never requires restarting the app. Setting `LISCA_NO_MODEL_DOWNLOAD=1` disables network fetches in isolated tests or air-gapped environments.

## Looks like a bug when

- `scripts/package-tauri.ts` builds desktop installers without copying `models/` into `src-tauri/resources`, yet Smart segment succeeds on a clean machine on first click.
- Align Selection shows `Log-std exclude` without a `Smart exclude` button while `python/src/lisca/services/smart_exclusion_*` still exists for offline training.
