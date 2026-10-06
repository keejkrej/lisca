# ADR-0008: The inference host loads assay models

- **Status:** accepted
- **Date:** 2026-10-06

## Decision

Run one inference host in this repo and load each encoder from its assay package,
because the host must serve more than one model while the killing assay keeps
EmbeddingGemma and the viable/dead classifier.

## Why

ADR-0007 put the whole service in `lisca-killing-assay`. That cannot grow a
second encoder, including another embedding model or a model trained for this
assay, without moving the host again. Batching, the pixel cache, authorization,
and `/v1/embeddings` are shared. EmbeddingGemma, its revision, and the
viable/dead kNN and SVM stay in `lisca-killing-assay`, and
`lisca.inference.server` imports that package's `register` function.

Studio still opens this host as a second private connection. ADR-0003's
same-origin workspace API stays intact. The token stays in page memory. The
in-tree killing ONNX pipeline is not redirected here.

## Looks like a bug when

- EmbeddingGemma weights or the viable/dead SVM are imported from this repo.
- Adding another encoder requires editing the batching or cache code.
- The viability panel sends movies through the workspace API.
