# 01 — Revive the severed client error channel

**What to build:** Every user-facing failure message in the product is currently the wrong one. `runClientEffect` collapses the typed error channel at the Promise boundary, so the tagged errors (`ClientError`, `TaskCommandError`) that the client carefully constructs are erased before any consumer can read them, and 35 call sites fall back to a generic message. Fix the one function so the specific error reaches the UI, and add a regression test that fails if the channel is severed again. This is the only user-visible defect in the audit.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The typed error channel survives to the call sites: a failure carrying a tagged error is distinguishable from a generic failure by consumers, without string-matching the message.
- [x] All 35 existing call sites keep working with no call-site changes.
- [x] A regression test fails if the error channel is erased again.
- [x] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck` (see issue 02).

See PRD §A and §3.A for the full analysis and the exact seam.
