# ADR-0013: Single Studio build with OpenRouter Gemini Embedding 2 for label-free assays

- **Status:** accepted
- **Date:** 2026-10-14

## Decision

We will ship one Studio build for all assays and run v1 label-free image embeddings through OpenRouter (`google/gemini-embedding-2`) with coarse-to-fine binary search over time series, because this removes the fluorescence vs. label-free build split, eliminates CUDA runtime bundling, and avoids running a separate inference server.

## Why

Maintaining separate `fluorescence`, `label-free`, and `cuda` Cargo features required two Studio distributions and either bundled heavy CUDA runtime libraries or relied on a local `cpu-microscopy` hand-crafted feature vector. Sending every frame of every ROI movie to a remote embedding endpoint would also be prohibitively expensive.

With `google/gemini-embedding-2` on OpenRouter (`POST https://openrouter.ai/api/v1/embeddings`), the Rust Studio server (`crates/lisca/src/inference`) normalizes 16-bit microscopy planes to 8-bit grayscale PNG data URIs and requests 768-dimensional L2-normalized embeddings directly. Users provide only their OpenRouter API key in **Settings → Inference** (or via `OPENROUTER_API_KEY`); there is no custom server endpoint URL setting in Studio Settings.

To keep time-series classification cheap, `crates/lisca/src/inference/service.rs` does not embed every frame of a movie. Instead, it embeds a coarse stride across time (`COARSE_STRIDE = 16`), fits the highest-support 0-or-1 step transition across the coarse predictions, short-circuits immediately when the coarse trajectory is constant, and runs binary search (`O(log S)` embeddings) inside the transition bracket `[lo, hi]` when a state change occurs. Identical plane pixels are cached in `inference/references.json`.

There is no CPU fallback encoder (`cpu-microscopy` is removed) and no silent CUDA-to-CPU fallback: if the OpenRouter API key is missing in Studio or CUDA is unavailable on the standalone Python host, execution fails fast.

Supersedes [ADR-0012](0012-two-studio-builds.md).

## Looks like a bug when

- Cargo manifests reintroduce `fluorescence`, `label-free`, or `cuda` feature splits, or bundle `ort/cuda`.
- Studio Settings exposes a custom inference server URL field instead of just the OpenRouter API key.
- Time-series classification embeds every frame in an ROI movie instead of coarse sampling + binary search.
- Missing OpenRouter credentials or missing CUDA silently falls back to a CPU placeholder encoder.
