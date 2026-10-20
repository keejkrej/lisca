# ADR-0014: Label-free killing classification uses the inference host

- **Status:** accepted
- **Date:** 2026-10-20
- **Supersedes:** [ADR-0004](0004-killing-predict-memory.md)

## Decision

We will score label-free killing viability on the inference host (frozen
EmbeddingGemma 2 plus a linear SVM head, registered by
`killing.inference.register`) and will not keep a local kill-model path in
this repository, because that on-device classifier does not work.

## Why

Studio Analyze for death-reporter and engagement never loaded a viability
model. The remaining local path resolved a kill-model directory and called
`lisca_killing::run_predict_to`. That path is retired. Label-free Studio
already dials the host. Keeping a local model resolver and a compile-time
fallback would leave a dead entry that looks like a supported product.

Rejected alternatives:

- Keep `lisca-killing`'s optional classifier feature enabled and resolve a
  local model directory when the host is down. That reintroduces a classifier
  this product has dropped.
- Replace the local model with another in-tree encoder. EmbeddingGemma and
  the linear head stay in `lisca-killing-assay` ([ADR-0008](0008-inference-host-loads-assay-models.md)).

## Looks like a bug when

- Studio Analyze tries to load a kill model from `models/` or an env var.
- `lisca` enables a local killing classifier feature on `lisca-killing`.
- Label-free classify is implemented a second time beside
  `killing.inference.register`.
