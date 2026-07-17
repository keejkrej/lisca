# 07 — Rust: de-duplicate the assay pipelines and fix the latent bugs

**What to build:** The same ResNet18 classifier is implemented twice on opposite sides of the `smart/` vs `analysis/` boundary; 101 byte-identical plotting lines are duplicated across the two assays, directly above the shared seam both already import; and the timeseries loading is duplicated. Alongside that sit several latent bugs the audit found, including a hand-rolled ISO-8601 date formatter that is a mis-transcribed calendar algorithm producing wrong years and corrupting the recency sort. Replace it with epoch milliseconds and remove the redundant sorts; do not add `chrono`, which reaches the relevant builds only through an optional feature chain.

Note the duplication argument stands on its own. The audit originally justified de-duplication as "so a third assay has a seam to sit on"; that premise is void — assay ids are a closed enum (`PRODUCT.md`). Argue this on duplication grounds alone.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Profile recency uses epoch milliseconds; the wrong-year bug and redundant sorts are gone, with coverage across Jan/Feb and year boundaries. No `chrono` dependency is added.
- [x] The ONNX classifier exists once.
- [x] The duplicated plotting and timeseries loading are consolidated onto the shared seam both assays already import.
- [x] The remaining latent bugs in PRD §F1 are fixed: epoch millis, the memory-touch schema and identifier guard, the un-deleted `RequestError`, and the unserialized generated `Unauthorized`.
- [x] `cargo check --workspace && cargo clippy --workspace -- -D warnings` is clean.

See PRD §F1, §F2, §F3.
