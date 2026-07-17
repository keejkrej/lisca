# 11 — Give the documented package boundaries teeth

**What to build:** `docs/packages/packages.md` and `docs/ui/ui-package-layout.md` document import boundaries that have zero lint enforcement — they are an honour system, and the one rule that does have teeth is voided by phantom dependencies (removed by issue 04). The audit found real boundary violations that no tool would have caught. Make the documented boundaries checkable so they stop drifting.

**Blocked by:** 04 — Delete the dead surface and the phantom dependencies; 08 — Move the Studio-only chart renderer out of `packages/ui`.

**Status:** resolved

- [x] The documented boundaries are enforced by lint, failing the build on violation rather than relying on review.
- [x] The rules encode what the docs already claim — this ticket does not invent new boundaries, it makes the existing ones real.
- [x] Known violations are either fixed or explicitly waived with a recorded reason; the rule ships green.
- [x] `vp lint` catches a deliberately introduced violation in a test run.

## Owner ruling

Enforce only existing documented rules: ban deep `@lisca/*/src` imports; require wizard/assay UI
types through `@lisca/contracts/assay`; enforce the documented UI feature-domain isolation; forbid
shared packages importing `apps/*`; and fail undeclared workspace-package imports. Do not add
single-consumer or speculative layering rules.

See PRD §G and `boundaries-honour-system-vacuous-clause`.
