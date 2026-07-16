# 07 — Rust: de-duplicate the assay pipelines and fix the latent bugs

**What to build:** The same ResNet18 classifier is implemented twice on opposite sides of the `smart/` vs `analysis/` boundary; 101 byte-identical plotting lines are duplicated across the two assays, directly above the shared seam both already import; and the timeseries loading is duplicated. Alongside that sit several latent bugs the audit found, including a hand-rolled ISO-8601 date formatter that is a mis-transcribed calendar algorithm producing wrong years and corrupting the recency sort — while `chrono` is already in the lock file.

Note the duplication argument stands on its own. The audit originally justified de-duplication as "so a third assay has a seam to sit on"; that premise is void — assay ids are a closed enum (`PRODUCT.md`). Argue this on duplication grounds alone.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The date formatter uses `chrono` (already in the lock file); the wrong-year bug and the corrupted recency sort are gone, with a test covering the years the hand-rolled algorithm got wrong.
- [ ] The ONNX classifier exists once.
- [ ] The duplicated plotting and timeseries loading are consolidated onto the shared seam both assays already import.
- [ ] The remaining latent bugs in PRD §F1 are fixed: epoch millis, the memory-touch schema and identifier guard, the un-deleted `RequestError`, and the unserialized generated `Unauthorized`.
- [ ] `cargo check --workspace && cargo clippy --workspace -- -D warnings` is clean.

See PRD §F1, §F2, §F3.
