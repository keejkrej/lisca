# 06 — Collapse the client onto one DI mechanism

**What to build:** `packages/client` has two dependency-injection mechanisms stacked on each other: a hand-rolled singleton port registry — which deprecates itself in its own doc comment — is the live path, and the Effect Layer is built on top of it. The registry's only claimed advantage over a Layer is test overrides, which have zero consumers. Collapse onto the Layer, so there is one DI mechanism and one port construction path.

**Blocked by:** 05 — Studio composes the Aligner but copies the Annotator.

**Status:** ready-for-agent

- [ ] The hand-rolled port registry is gone and the Layer is the only DI mechanism.
- [ ] `createLiscaPortCore` returns the client directly; the dead re-exports and the `bootstrap.port`/`runPromise` path are gone.
- [ ] Each per-app port file drops to roughly its irreducible content.
- [ ] Test-override capability is either genuinely used by a test or not reintroduced.
- [ ] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck`.

See PRD §H4 and §3.H.
