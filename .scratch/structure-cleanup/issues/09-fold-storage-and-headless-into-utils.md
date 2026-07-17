# 09 — Fold `packages/storage` and the Solid-free headless modules into `utils`

**What to build:** `packages/storage` is a 145-line single file wearing a package costume — half of it dead. Its live half is the only per-user state in the product (Studio profiles and recent workspaces) and belongs in `@lisca/utils`. Separately, `packages/ui-headless` has a 385-line public tail with no Solid coupling; those five modules belong in `utils` too, which dissolves both shims and leaves `ui-headless` with a coherent definition: Solid-coupled headless state only.

This is the only package deletion in the target structure: **−1 package**.

**Blocked by:** 03 — Delete the React Native tier's abandoned seams.

**Status:** resolved

- [x] `packages/storage` is gone; its live half is in `@lisca/utils` and its dead half was removed by issue 03.
- [x] The five Solid-free modules have moved from `ui-headless` to `utils`; both shims are gone.
- [x] `packages/ui-headless` contains only Solid-coupled headless state, and its definition is stated where a reader will find it.
- [x] `docs/packages/packages.md` is corrected in the same commit.
- [x] `vp run check` shows no new failures beyond the 3 known `*-desktop#typecheck`.

**Before starting:** `packages/utils` already has a `defaultContrastDomain` name collision — two functions, same name, different uint16 behavior in one barrel, plus a third copy elsewhere. Resolve that first or you will fold more code into a barrel that already shadows itself. See PRD §4, last item.

## Owner ruling

The canonical default is pixel-type aware: uint8 uses 0–255 and uint16 uses 0–65535. Consolidate
the copies around that behavior with regression coverage before folding modules into utils.

See PRD §G2, §G3.
