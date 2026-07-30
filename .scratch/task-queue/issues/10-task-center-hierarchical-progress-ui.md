# 10 — Task Center progress UI (two bars per operation, one fold)

**What to build:** Redesign the Task Center so progress is **visual and dense**. Each long-running **operation** shows **two progress bars** as the primary signal. Use **at most one fold level** so the list stays scannable when many operations run concurrently—**not** the current double-nested task/attempt folds.

**Blocked by:** 09 — Detailed within-task progress API; 04 — Open the shared Task Center from Aligner.

**Status:** resolved

## Problem

Current Task Center is text-heavy and information-light: long IDs, queue metadata, **two** foldable levels (operation → tasks → attempts), and only coarse task counts. During a long crop, users learn little about real unit progress. A second nested fold does not help; listing every position as its own bar also fails to scale when positions run sequentially and N is large.

## Fold model: exactly one level

| Level | Fold? | Content |
|-------|--------|---------|
| **Operation list** | **Yes (one fold)** | Many concurrent operations: each row is collapsible so the list can stay compact |
| **Inside an operation** | **No second fold** for progress | Always (when expanded, or always-visible summary—see below) show the two bars; no task/attempt tree required for progress |

**Why one fold:** With many concurrent Operations (several crops/analyses), collapsing older or secondary ops keeps the modal usable. Nested fold-under-fold (today’s tasks + attempts) is the part to remove from the default path.

**Collapsed operation row (list at scale):** short title + **at least the position bar** (or a single combined summary) + active/attention cue—enough to scan without expanding everything.

**Expanded operation row (or the only row when few ops):** full **two-bar** progress chrome (below)—still **no** nested fold for positions/tasks.

Optional “⋯ Details” for UUIDs / attempts / errors is fine; it must not be a second progress fold.

## Two bars (inside the operation)

```
▼ Crop · 20260730_1                         [Cancel]
    Positions   [████████░░░░]  3/10
    Pos4        [████████████░░]  1200/1800 roiframes
```

| Bar | Meaning |
|-----|---------|
| **Positions** | `pos_completed / pos_total` — position Tasks done vs total for this Operation |
| **Current pos** | `roiframe_completed / roiframe_total` for the **single running** position, labeled `Pos{k}` |

Rules:

- Positions are processed **sequentially** for crop: bar B tracks only the **current** running position (not one bar per pos). When Pos4 finishes and Pos5 starts, bar B switches—row height stays O(1).
- If the scheduler ever runs multiple position Tasks in one Operation, still prefer **one** primary running pos on bar B + a short `+K running` note—not N bars by default.
- Terminal ops: bar A final; bar B hidden or replaced by a one-word state (`Completed` / `Failed`) + short error.
- Single-position jobs: bar A is `0/1`→`1/1`; bar B carries most of the signal.

**roiframe** = smallest crop unit from issue 09 (or reported `unit` string).

## UX principles

1. Bars first; labels are short fractions and `PosN`.
2. Demote IDs to optional detail.
3. **One fold max** for structure (operation open/closed in a busy list); **zero folds** required to read the two bars once an op is open (or on the compact summary).
4. No blocking overlay.
5. Stall cue optional via `updatedAtMs` (issue 09).

## Acceptance criteria

- [x] Operation progress is primarily **two bars** (positions + current-pos roiframe), not prose or ID dumps.
- [x] At most **one** fold level in the default Task Center hierarchy (operation expand/collapse when useful for many concurrent ops)—no nested task/attempt fold required to see progress.
- [x] Multi-position crops do not default to a bar list of every position; only the running position’s roiframe bar is shown.
- [x] With many concurrent operations, collapsed rows remain scannable (title + progress cue); expanding shows the two bars without a further progress fold.
- [x] Cancel/retry remain reachable without reading long IDs.
- [x] Task button active/attention indicators and ordering unchanged in meaning.
- [x] Tests: 1-pos; multi-pos handoff on bar B; many ops with collapse/expand; completed/failed affordances.
- [x] Poll/reconcile updates bars without layout thrash.
- [x] Shared Task Center component (Aligner first; reusable elsewhere).

## Non-goals

- Issue 09 API itself (this ticket **consumes** it).
- Two nested progress folds or a full tree of position bars as the default UX.
- Pixel-perfect Chrome downloads clone.

## Implementation notes

- Keep a single expand/collapse on the operation row for concurrent-op scale; strip default nested task/attempt folds from the progress path.
- Bar A ← Operation position-task completion. Bar B ← running Task `workProgress` (issue 09).
- API only—no staging-dir scraping.
- A11y: progressbars labeled `Positions` and `Position k ROI frames`; expand/collapse has a clear accessible name.

## Comments

- 2026-07-30: Nested fold with one bar per pos → then current-pos only → then “no folds, just two bars.”
- 2026-07-30: **Clarify** — folds are still useful when **many concurrent operations** exist; **one fold is enough** (operation open/closed). Inside an op: **two bars**, no second fold for progress.

## Answer

The shared Task Center now renders operation-position progress and the active position's
`roiframe` progress as the primary compact signals. The operation row remains the sole
expand/collapse level; task status, failures, cancel, and retry are presented flat inside it,
with UUID and attempt-tree chrome removed from the normal path.

Focused verification:

- `vp run --filter @lisca/ui test`
- `vp run --filter @lisca/ui typecheck`
