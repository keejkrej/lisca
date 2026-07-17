# 03 — Delete the React Native tier's abandoned seams

**What to build:** `PORTING.md` deleted the React Native / Expo / mobile tier rather than migrating it, but left its seams behind. Two packages still carry "native platform" abstractions whose second platform no longer exists, plus a Victory charting constant and a capabilities indirection with one implementation. Pure deletion — the second consumer these abstractions existed to serve is gone. Fix the docs that describe them in the same commit so no reader is left pointing at deleted code.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The `capabilities` indirection, the Victory domain-padding constant, the dead half of `packages/storage`, the `batch` injection and its ui wrapper, and the headless `contrast-control` are gone.
- [x] `docs/analysis/analysis.md` and `docs/ui/ui-package-layout.md` no longer describe the deleted abstractions, corrected in the same commit.
- [x] Behavior is unchanged; no test asserts on the removed indirection.
- [x] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck`.

**Owner decision this depends on:** `docs/contracts/contracts.md` asserts the Rust server "can be swapped for any other backend"; `docs/analysis/analysis.md` describes a "platform-agnostic" chart layer. Nothing exercises either claim. If those are live commitments rather than vestiges, `capabilities.ts` stays and this ticket shrinks. Confirm before deleting.

## Owner ruling

The portability claims are vestiges, not current product commitments. LiSCA supports its Rust
backend and web/desktop UI; delete the zero-consumer native/platform abstractions and correct the
backend-swappability wording in `docs/contracts/contracts.md`.

See PRD §C and §3.C.
