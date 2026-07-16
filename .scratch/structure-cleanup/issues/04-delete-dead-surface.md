# 04 — Delete the dead surface and the phantom dependencies

**What to build:** A long tail of exported-but-unreachable code and dependencies declared in manifests but never imported. Each item is independently verified zero-consumer. Pure deletion, no behavior change. The phantom deps matter beyond tidiness: they void the one package-boundary lint rule that has teeth, so removing them restores enforcement (see issue 12).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The 7 phantom dependency lines across 6 manifests are gone, and the boundary rule they voided now has effect.
- [ ] The dead API-client service and layer, the unused ui components and their `theme.css` blocks, the dead hooks subpath, the unreachable shell components, the dead probe, the dead studio bridge and progress modal, and the studio orphan assets are gone.
- [ ] `progress-poll.ts` uses `globalThis.` rather than `window.`, and `task-center.ts`'s dead options are gone.
- [ ] Every deletion is verified zero-consumer at the time of deletion, not assumed from the audit's snapshot — re-grep before removing.
- [ ] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck`.

See PRD §E and §3.E for the itemized list with citations. Re-anchor line numbers before editing.
