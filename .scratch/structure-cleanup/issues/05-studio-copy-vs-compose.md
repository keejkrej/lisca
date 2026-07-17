# 05 — Studio composes the Aligner but copies the Annotator

**What to build:** Studio's backend composes Aligner and Annotator totally — its binary merges their routers. Its frontend does the same for the Aligner port and atoms, then copy-pastes the Annotator equivalents instead. The copies have already drifted, which is the cost landing. In both files the correct compose-pattern sits within a line or two of the copy, so this is replacing a copy with the pattern already in view, not inventing one.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The Studio annotator port composes the Annotator port rather than duplicating it, matching how it already composes the Aligner port.
- [x] The Studio annotator atoms compose rather than duplicate, and the duplicated types move with them.
- [x] The drift between the copy and its original is resolved — record which behavior was correct and why, rather than silently picking one.
- [x] The three per-app port files, byte-identical after normalizing two values, are reduced to one shared construction path.
- [x] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck`.

See PRD §D1, §D2 and §3.D.

## Comments

### Contrast drift owner decision

Annotator's required-but-nullable `contrast` parameter is canonical. Studio composes and exposes
the same Annotator port, so both surfaces should require callers to represent absence explicitly as
`null` rather than giving Studio a looser copied signature. This is a type-level correction only:
the shared implementation already normalizes the value to `null` on the wire, so no runtime behavior
change is needed.
