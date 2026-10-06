# Remote image inference

Studio's Analysis page has a **Label-free viability** panel. Connect it to a
private inference server, choose a reference set, and upload ROI TIFF movies with
their Position's `index.json`. The host loads the killing assay's frozen
EmbeddingGemma 2 encoder and cosine kNN; the browser performs no neural
inference in this flow. Results
include frame-by-frame viable vote support, a retrospective one-transition fit,
and CSV/JSON export. This is an explicit experimental workflow; it does not replace
the existing Analyze task or migrate the older Smart exclude, Smart segment, or
ONNX assay implementations.

## Install on Spark

Use the `~/workspace/lisca` checkout on the GPU machine, plus
`~/workspace/lisca-killing-assay` for EmbeddingGemma and the viability task.
Spark is ARM64: install a CUDA-enabled PyTorch build that supports its GB10
before starting the service. Keep this environment separate from the desktop
Python tools and from ResNet training:

```sh
cd ~/workspace/lisca/python
uv venv .venv-inference --python 3.12
# Select the host-supported CUDA wheel index; cu130 is used on the tested RTX 5090.
uv pip install --python .venv-inference torch --index-url https://download.pytorch.org/whl/cu130
uv pip install --python .venv-inference -e . -r requirements-inference.txt
uv pip install --python .venv-inference -e ~/workspace/lisca-killing-assay \
  -r ~/workspace/lisca-killing-assay/requirements-inference.txt
.venv-inference/bin/python -c 'import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name())'
mkdir -p ~/.config/lisca ~/.config/systemd/user
cp ../deploy/inference/inference.env.example ~/.config/lisca/inference.env
chmod 600 ~/.config/lisca/inference.env
```

Replace the token in `inference.env` with a random secret (for example, generated
with `python3 -c 'import secrets; print(secrets.token_urlsafe(32))'`). Set allowed
origins to the exact Studio URLs that will call the service. Optional
`LISCA_INFERENCE_REFERENCES` imports the existing offline experiment's reference
split as `fig6-apoptosis`, checking model revision, vector shape, and row identity.
Existing sets are immutable; a mismatching import fails startup.

```sh
cp ../deploy/inference/lisca-inference.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now lisca-inference
journalctl --user -u lisca-inference -f
```

For operation across logout/reboot, the machine administrator can enable user
lingering (`loginctl enable-linger USER`). Model download and GPU initialization
occur at startup, before readiness. The model stays resident. Do not add uvicorn
workers on one GPU: each would load another model and fragment batching/cache state.

## Tailscale connection

Tailscale normally keeps Spark private to devices and users allowed in your
tailnet. Use **Tailscale Serve** to provide private HTTPS to the loopback service:

```sh
tailscale serve --bg http://127.0.0.1:8910
tailscale serve status
```

Enter the HTTPS origin shown by Serve and your token in Studio, then select
**Test connection**. The URL is remembered locally; the token is kept only in page
memory. Configure tailnet access rules for the devices/users who need inference.
Check existing Serve configuration before assigning its HTTPS listener.

**Tailscale Funnel** is different: it exposes a service to the public internet.
It is not enabled by this implementation. Private HTTPS is sufficient here and
avoids browser mixed-content errors when Studio itself uses HTTPS. For development
on an HTTP Studio origin, the service can instead bind only the Tailscale IP:
`python -m lisca.inference.server --host YOUR_TAILSCALE_IP`. Do not use an HTTPS
Studio page with an HTTP inference URL. Authentication applies to every API route;
CORS allows only configured origins. Tokens do not appear in URLs or access logs.

Official references: [Serve](https://tailscale.com/kb/1242/tailscale-serve) and
[Funnel](https://tailscale.com/kb/1223/funnel).

## References and movie inputs

- Add both viable and dead PNG/JPEG examples in Studio (up to 128 per set, 2 MB
  per image). Use per-frame 1st/99th percentile normalization, matching the default
  imported apoptosis experiment. Examples should depict the intended cell, without
  neighboring cells. References remain on the server as vectors and labels.
- Choose a new set name to revise references. The encoder is never fine-tuned.
  Collection names and vectors are immutable so an analysis cannot change halfway
  through. JSON results record reference name and encoder revision.
- Select movies from one Position and that folder's `index.json`. The index
  supplies TCZYX shape and acquisition Frame IDs. Missing time/channel metadata is
  rejected instead of treating channels as consecutive Frames. Self-describing
  TYX/TCZYX TIFFs also work without an index.
- Channel and Z are zero-based stored stack indices. Uploads are limited to 63 MiB
  in Studio (64 MiB for the total server request), one megapixel per plane, and
  4,096 Frames per movie. The server decodes at most 32 selected planes at a time.
- Give the original `PosN/RoiN` identity, or `PosN` for multiple files named
  `RoiN.tif`. Known reference groups are rejected as queries. User-provided names
  are not an independent leakage guarantee; do not reuse reference ROIs to claim
  accuracy. No accuracy is fabricated for unlabeled movie uploads.
- Defaults: stride 1, history 1. Optional history averages **kNN vote support**
  causally; it is not the offline experiment's averaging of both reference and
  query embeddings. Raw support remains in the response. The step fits the whole
  sequence, allows constant viable/dead states, and reports tied optima. It is not
  an online detector or a calibrated probability.
- Cancel stops the client upload/wait and prevents subsequent movies. Work already
  in a GPU batch can finish and populate cache. Completed movie results remain
  available if a later movie fails; rerunning reuses cached embeddings.

## Throughput and API

One resident GPU worker batches up to eight images across requests after at most
10 ms of queue wait. Both values are configurable with `--batch-size` and
`--batch-wait-ms`. Eight was the fastest tested batch size on RTX 5090; this is not
an assertion of maximum throughput on Spark. Float32 preserves the validated
encoder configuration. Mixed precision, compilation, and multiple GPUs have not
been benchmarked. Scale by assigning separate workers to separate GPUs, not by
duplicating workers on the same device.

SQLite caches normalized vectors by decoded RGB pixels and encoder identity
(revision, precision, RGB pipeline). Concurrent identical requests share one
pending result; labels do not invalidate embeddings. Cache eviction retains at
most 100,000 vectors. Reference sets persist separately. Backpressure limits four
active analyses and 256 queued unique images; busy responses use HTTP 503 with
`Retry-After`. Clients show the error rather than silently resubmitting uploads.

Authenticated endpoints:

| Route                 | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `GET /v1/health`      | Protocol, encoder, queue depth, cache/batch counters    |
| `GET /v1/references`  | Available reference sets                                |
| `POST /v1/references` | Embed labeled examples and create an immutable set      |
| `POST /v1/embeddings` | Generic frozen embeddings for up to 32 PNG/JPEG images  |
| `POST /v1/viability`  | Multipart ROI movie + optional index; kNN and trace     |
| `GET /openapi.json`   | FastAPI's executable request/response API documentation |

The client transport is in `@lisca/client/inference`; shared TypeScript response
types are in `@lisca/contracts/inference`. All model computation occurs on the
inference host. The existing workspace backend remains same-origin/desktop IPC.

## Validation and deployment status (2026-10-06)

Spark SSH timed out, so installation and throughput on Spark are **not verified**.
A real service is running privately on nv5090 at `http://100.89.37.10:8910` as
`lisca-inference-experiment.service` (user service). Its protected token file is
`~/data/lisca-inference-20261006/server.env`; no public listener or Funnel was set
up. Stop it with `systemctl --user stop lisca-inference-experiment`.

An HTTP upload of Figure 6 Pos0/Roi4 plus its index produces all 25 sampled
predictions identical to the offline single-frame experiment, including the
Frame 170 transition. A repeated cached request takes about 0.25 seconds on that
host, excluding a remote client's WAN upload. Test coverage includes auth/CORS,
batching/deduplication, persistent cache, backpressure/shutdown, reference/query
separation, TIFF channel/frame metadata, and constant-state step fits.

A full 241-frame Roi4 upload then took 9.12 seconds with some embeddings already
cached from prior checks, and 0.37 seconds on the fully cached repeat. Its raw kNN
step is Frame 168 (manual annotation: 166). This is one movie, not event-time
validation across the dataset.

The live Studio browser connected over Tailscale and submitted a five-frame Roi4
excerpt plus its index; the returned trace rendered with a Frame 170 step.
Studio's production build passes, as do 159 client tests and 26 focused Python
tests (including eight server tests). Ruff and targeted Python type checks pass.
The full repository check passes lint, type, contract, and Rust checks, then hits
the existing Windows UI-test failure resolving `file:///@solid-refresh`.
