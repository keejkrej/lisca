# Image inference

Studio ships as a single build that supports both fluorescence and label-free
assays without any `fluorescence`, `label-free`, or `cuda` Cargo feature split
and without bundling ONNX Runtime CUDA libraries (ADR-0013).

For v1 label-free assays, the Studio router (`/studio/label-free/*`) embeds ROI
frames through OpenRouter using `google/gemini-embedding-2` (768 dimensions). It
uses the same client transport as the rest of Studio: Tauri IPC in the desktop
app and same-origin HTTP when Studio is hosted (ADR-0002). Users configure their
OpenRouter API key in **Settings → Inference** (stored in memory for the
session via `POST /studio/label-free/key`, or supplied via the
`OPENROUTER_API_KEY` environment variable); there is no custom inference
endpoint URL setting in Studio.

## OpenRouter label-free pipeline and temporal optimization

1. **Reference set creation (`POST /studio/label-free/references`):**
   - Reads classification annotations from the open workspace.
   - Normalizes each 16-bit microscopy plane using 1st–99th percentile linear
     stretching into an 8-bit grayscale PNG data URI (`data:image/png;base64,...`).
   - Sends batched multimodal image embedding requests (up to 32 frames per
     request) to `https://openrouter.ai/api/v1/embeddings` with model
     `google/gemini-embedding-2` and L2-normalizes the returned 768-d vectors.
   - Stores immutable reference sets and a content-addressed plane embedding
     cache (`inference/references.json`).

2. **Coarse-to-fine + binary-search classification (`POST /studio/label-free/classify`):**
   - Single-frame ROIs are embedded and classified by 3-nearest-neighbor cosine
     similarity against the reference set.
   - Multi-frame ROI movies avoid embedding every frame:
     - First, a coarse pass samples every 16th frame (`[0, 16, 32, ..., T-1]`)
       and evaluates 3-NN vote support.
     - A 0-or-1 step transition model is fit across the coarse sequence. If the
       trajectory is constant (`initial_label == final_label`), Studio returns
       immediately without embedding intermediate frames.
     - When a state transition is detected between coarse indices `[lo, hi]`,
       binary search bisects `[lo, hi]` (`O(log S)` frames) to pinpoint the exact
       transition timepoint.

3. **No CPU fallback:**
   - There is no local CPU microscopy placeholder encoder. If no OpenRouter API
     key is configured or OpenRouter returns an error, label-free operations
     fail fast.

## Standalone Python GPU host (deferred alternative)

`python -m lisca.inference.server` remains available for private-tailnet GPU
experiments with `lisca-killing-assay`, and requires a CUDA device (`--device
cuda`); non-CUDA devices fail fast at startup.

```sh
cd ~/workspace/lisca/python
uv venv .venv-inference --python 3.12
uv pip install --python .venv-inference torch --index-url https://download.pytorch.org/whl/cu130
uv pip install --python .venv-inference -e . -r requirements-inference.txt
uv pip install --python .venv-inference -e ~/workspace/lisca-killing-assay \
  -r ~/workspace/lisca-killing-assay/requirements-inference.txt
```
