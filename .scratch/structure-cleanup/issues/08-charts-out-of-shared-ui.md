# 08 — Move the Studio-only chart renderer out of `packages/ui`

**What to build:** A Studio-only Observable Plot renderer sits in `packages/ui`, forcing `@observablehq/plot` and `@lisca/analysis` onto five packages that cannot reach the code. Move it to where its only consumer lives. This also determines the fate of `packages/analysis` (see the owner decision below), so it lands first.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The chart renderer lives with its only consumer in `apps/studio/web`.
- [ ] `packages/ui` no longer depends on `@observablehq/plot` or `@lisca/analysis`, and the four other packages no longer carry those transitively.
- [ ] Any dependency the renderer needs at its new home is declared there — verify `d3-array` and `@types/d3-array` are actually reachable from `apps/studio/web` rather than assuming.
- [ ] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck`.

**Owner decision this unblocks:** once this lands, `packages/analysis` has exactly one consumer, no build script, and a central export typed against `StudioPortService` — it cannot serve a non-Studio consumer without a signature change. Three options in PRD "Owner decisions": fold it into `apps/studio/web`, move only its atoms, or keep as-is. Independent of the choice, three zero-consumer exports in it are deletable.

See PRD §G1 and §3.G.
