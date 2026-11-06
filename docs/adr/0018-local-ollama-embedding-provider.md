# ADR-0016: Local Ollama embeddings as a second label-free provider

- **Status:** accepted
- **Date:** 2026-11-05

## Decision

Studio keeps one build and one label-free pipeline, but the embedding provider
becomes a runtime choice between OpenRouter (`google/gemini-embedding-2`) and a
local Ollama server (`embeddinggemma-2`). Local users select it with
`POST /studio/label-free/key` (`{ "provider": "ollama" }`) from **Settings →
Inference**, or with `LISCA_EMBEDDING_PROVIDER=ollama`. The Ollama base URL comes
from `LISCA_OLLAMA_URL` (default `http://127.0.0.1:11434`).

This amends [ADR-0013](0013-openrouter-label-free-single-build.md): the single-build
and no-CUDA-bundle consequences stand, but "OpenRouter is the only provider" does not.

## Why

Labs with capable local hardware should not send every reference frame and every
binary-search probe of a time series to a paid remote endpoint; a 271M multimodal
embedding model answers in ~0.1 s per 96 px ROI frame on a modern CPU, and the same
coarse-stride + binary-search schedule keeps a whole 150-frame ROI movie under
~15 embeddings. Keeping the choice explicit (rather than auto-detecting a running
Ollama) preserves fail-fast behavior and keeps the cache honest.

## Encoder identity

Reference sets and the plane cache are keyed by `<model>:<revision>:<dimensions>`
today. The provider therefore enters that key (`ollama:embeddinggemma-2:latest:v1:768`),
so sets built through OpenRouter never mix with local ones, and switching
provider surfaces as "no reference set for this encoder" instead of silently
comparing incomparable vectors.

## Transport notes

Ollama's OpenAI-compatible `/v1/embeddings` rejects image content parts
(`input.content must be a string`). The native `POST /api/embed` accepts one
object per input of the shape `{ "text": "...", "image": "<raw base64 PNG>" }`;
`images` (plural) and `data:` URIs are rejected. The text prompt is constant for
every frame because it is part of the embedding.

There is still no silent fallback: a missing OpenRouter key fails, and an
unreachable Ollama server fails with the URL and the `ollama pull` hint.

## Looks like a bug when

- A reference set built with one provider is listed or used by the other.
- Studio falls back to OpenRouter (or to a CPU placeholder) when the selected
  provider is unavailable.
- The Ollama path sends `data:` URIs, `images`, or a per-frame text prompt.
- Local embeddings reuse the OpenRouter cache keys.
