# 05 — Studio composes the Aligner but copies the Annotator

**What to build:** Studio's backend composes Aligner and Annotator totally — its binary merges their routers. Its frontend does the same for the Aligner port and atoms, then copy-pastes the Annotator equivalents instead. The copies have already drifted, which is the cost landing. In both files the correct compose-pattern sits within a line or two of the copy, so this is replacing a copy with the pattern already in view, not inventing one.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The Studio annotator port composes the Annotator port rather than duplicating it, matching how it already composes the Aligner port.
- [ ] The Studio annotator atoms compose rather than duplicate, and the duplicated types move with them.
- [ ] The drift between the copy and its original is resolved — record which behavior was correct and why, rather than silently picking one.
- [ ] The three per-app port files, byte-identical after normalizing two values, are reduced to one shared construction path.
- [ ] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck`.

See PRD §D1, §D2 and §3.D.
