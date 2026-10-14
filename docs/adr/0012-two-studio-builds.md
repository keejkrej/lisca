# ADR-0012: Two Studio builds, one inference protocol

- **Status:** superseded
- **Superseded by:** [ADR-0013](0013-openrouter-label-free-single-build.md)
- **Date:** 2026-10-13

## Decision

We will keep fluorescence Studio as the light Rust build, and add a heavier
Rust build that mounts an embedded label-free inference server and can bundle
the ONNX Runtime CUDA 12 libraries, because the same protocol must also keep
running as the independent Python host.

## Why

A fluorescence laptop cannot download CUDA or EmbeddingGemma. Label-free work
needs those libraries on the machines that have a GPU, without a separate
toolkit install. The cargo features `label-free` and `cuda` are that split.
Release packaging still builds the light feature set.

The embedded server is Rust and is part of the Studio router, at
`/studio/label-free`. The Studio client carries those calls: desktop builds
dispatch them through `lisca_request` (ADR-0002), and hosted builds use
same-origin HTTP. There is no second HTTP transport for the embedded encoder.
Reference and classify routes mount only when `label-free` is enabled. Health
is always mounted so the client can tell the builds apart. Its encoder is
`cpu-microscopy` `v1`, a frozen CPU embedding. It is not EmbeddingGemma.
EmbeddingGemma stays in `lisca-killing-assay` and loads in
`python -m lisca.inference.server`. A fine-tuned microscopy revision would
register there as another encoder. This repository does not train or store
those weights.

Classification annotations are the reference set. The user labels a few ROI
frames on Annotate. The embedded server embeds those frames, stores an
immutable set, and classifies other ROIs by cosine k-nearest neighbors.
Replacing a set means choosing a new name. Vectors for identical pixels are
cached. The `cuda` build links the CUDA execution provider for ONNX sessions
and falls back to CPU when the provider cannot start. The microscopy encoder
itself stays on CPU.

Rejected alternatives: vendoring EmbeddingGemma in this repo, embedding the
Python host inside the desktop process, and making the light build download
CUDA.

## Looks like a bug when

- The light fluorescence build mounts reference or classify routes, or links the CUDA ONNX runtime.
- Embedded label-free calls use their own HTTP client instead of the Studio API client.
- The label-free UI calls `cpu-microscopy` EmbeddingGemma.
- EmbeddingGemma weights appear under `models/`.
- The Python host is removed, or the embedded server is rewritten in Python.
- Building a reference set with an existing name replaces its vectors.
- The heavier build asks the user to install the CUDA toolkit before ONNX Runtime can use the bundled CUDA provider.
