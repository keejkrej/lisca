# 06 — Run cropping as one Task per position

**What to build:** Migrate crop submission to the canonical scheduler so one user Crop Operation owns exactly one bounded crop Task per selected position. Each position can finish, fail, cancel, or retry independently, publishes only its complete declared output, and remains visible through the Task Center while established crop consumers receive a compatibility projection.

**Blocked by:** 03 — Cancel and retry Task attempts; 04 — Open the shared Task Center from Aligner.

**Status:** resolved

- [x] A crop request for N selected positions creates one Operation with exactly N logical crop Tasks, including a representative 100-position request that creates 100 one-position Tasks and no monolithic crop execution path.
- [x] Each crop Task owns only one position's output boundary, checks cancellation at safe bounded checkpoints, stages output away from its published destination, and commits atomically only after successful computation and a final cancellation check.
- [x] Failed or cancelled crop Attempts publish no new partial position output, clean staging artifacts best-effort, and retry replaces or reuses only that logical Task's declared output without changing successful sibling positions.
- [x] Independent position failures and cancellation leave successful siblings intact and visible, with accurate Operation counts and position context available in detail.
- [x] Existing crop progress and latest-progress consumers are compatibility projections derived from canonical state rather than an independent scheduler or mutable source of truth.
- [x] Starting and running cropping no longer presents a blocking progress modal or disables unrelated workflow/navigation; progress, errors, cancellation, and retry are available through the Task Center.
- [x] Integration tests cover multi-position independence, exact 100-position decomposition, cooperative cancellation, retry, aggregate counts, atomic publication, and preservation of successful sibling output using temporary workspaces and controlled execution.
- [x] The implementation starts from current crop and contract edits, preserves unrelated dirty-tree changes, and verifies the resulting diff before completion.

## Answer

Crop submission is implemented as one canonical scheduler Task per selected position. Each
Task calls the per-position atomic crop path, uses scheduler cancellation checkpoints, and
owns only `roi/PosN`; the legacy crop-progress endpoints are projections over the canonical
Operation and Task records. Focused verification passed:

- `cargo test -p aligner-server crop_task_tests -- --nocapture`
- `cargo test -p aligner-server crop::tests -- --nocapture`
