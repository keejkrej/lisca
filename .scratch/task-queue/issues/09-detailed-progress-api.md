# 09 — Detailed within-task progress API

**What to build:** Extend the canonical tasks API (and Task Center projections) so long-running Tasks expose **fine-grained progress** beyond the coarse Operation counters (`completed` / `running` / `total` of child Tasks). A single-position crop of a multi-hour time-lapse must report meaningful sub-progress (e.g. ROIs written, frames processed) while the Task stays `running`, not only flip `completed` when the entire position finishes.

**Blocked by:** 03 — Cancel and retry Task attempts; 06 — Run cropping as one Task per position (compatibility projection path must remain the source of truth).

**Status:** ready-for-agent

**Context (why now):** During fig5 LNP binding crop of `~/data/lisca_review/fig5/20260730_1` (Pos0, **48 ROIs**, **1801** timepoints × 2 channels, full 4 s stacks), Task Center / `GET /tasks/operations` correctly reported:

```json
{ "status": "running", "progress": { "completed": 0, "running": 1, "total": 1 } }
```

for the entire duration of the Pos0 crop. Disk showed real work (temp `roi/.Pos0.crop-*/Roi*.tif` count and multi‑GB growth), but the API had **no ROI- or frame-level counters**. Clients (Task Center banner, polling scripts, recovery UI) cannot estimate ETA or detect stall vs active write.

## Goals

1. **Typed progress payload** on Task (and optionally Operation aggregates) for “work units inside one Task.”
2. **Crop as first consumer:** report ROI index / total ROIs, optional frame/time index when that is the natural loop.
3. **Task Center UI** surfaces the detail without exploding the default list (summary line + detail panel).
4. **Backward compatible:** existing clients that only read Operation-level counts keep working; new fields are additive.

## Non-goals

- Sub-second streaming (HTTP poll at ~1–2 s is enough initially; SSE/WebSocket optional later).
- Cross-process durable history of every progress tick.
- Changing crop atomicity (staging + rename remains required; progress must not expose half-published `roi/PosN/` as final).

## Proposed shape (sketch — refine in contracts)

Additive fields on task attempt / task detail (names illustrative):

```ts
// Conceptual; implement via Effect Schema + regenerate OpenAPI/Rust types
type TaskWorkProgress = {
  /** Stable unit label for UI, e.g. "roi", "frame", "position" */
  unit: string;
  completed: number;
  total: number;
  /** Optional free-form phase for multi-stage tasks */
  phase?: string | null;
  /** Optional human message, e.g. "Writing Roi17" */
  message?: string | null;
  updatedAtMs: number;
};
```

- Operation summary may expose `workProgress` as a **rollup** when a single Task is running (or sum of running Tasks’ units when homogeneous).
- Crop handler updates progress at safe checkpoints (after each ROI stack commit to **staging**, or after each N frames if ROI-open-for-all-times pattern).
- Compatibility crop-progress endpoints (`getLatestCropProgress`, etc.) should project the same numbers so Aligner crop recovery and Task Center do not diverge.

## Acceptance criteria

- [ ] Contracts (`@lisca/contracts` / OpenAPI) define optional structured within-task work progress; Rust `typify` types regenerate cleanly; no hand-written wire types.
- [ ] `GET /tasks/task` and `GET /tasks/operation` return current work progress for in-flight crop Tasks (at least `unit`, `completed`, `total`, `updatedAtMs`).
- [ ] `GET /tasks/operations` list summary includes enough for Task Center to show a secondary progress line (e.g. `17/48 rois`) without a second round-trip for the active item, or document why detail-only is preferred and implement that consistently.
- [ ] Crop Task updates progress as ROIs (or frames) complete in **staging**; progress never implies final `roi/Pos{N}/` publication before atomic commit.
- [ ] Task Center Aligner UI shows within-task progress for running crop operations (list and/or detail); no blocking overlay; polling/reconcile path reused.
- [ ] Stall detection is possible: `updatedAtMs` advances while work proceeds; documented behavior if a long single write holds the counter still (prefer updating message or phase).
- [ ] Unit/integration tests: synthetic crop or handler fixture advances progress mid-flight; Operation stays `running` with `tasks.completed=0` until Task completes; final state clears or freezes progress sensibly.
- [ ] Implementation preserves unrelated dirty-tree changes; starts from current task-scheduler / crop code.

## Implementation notes

- Today progress is only Operation-level task counts (`deriveOperationProgress` / scheduler progress buckets). Within-task counters likely live on `TaskAttempt` or task runtime state, updated by handlers via a small scheduler API (`report_work_progress(task_id, …)`).
- Crop currently stages under `roi/.Pos{N}.crop-<id>/`; file-count on disk is a workable interim signal but **must not** be the client’s only source of truth once this lands.
- Related: Vite dev proxy must keep `/tasks` in `LISCA_API_PROXY_PREFIXES` (fixed separately) so LAN Task Center can poll at all.

## Comments

- 2026-07-30: Filed after fig5 functionalized-LNP crop (`20260730_1`, 48 ROIs × 1801 t × 2 ch). Observed live: API always `0/1 running` while temp ROI dir grew 3→5+ GB with 32 open ROI stacks.
