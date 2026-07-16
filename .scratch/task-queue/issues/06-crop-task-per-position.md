# Run cropping as one Task per position

Status: ready-for-agent
Blocked by: 03, 04

Source: [PRD.md](../PRD.md)

**What to build:** Migrate crop submission to the canonical scheduler so one user Crop Operation owns exactly one bounded crop Task per selected position. Each position can finish, fail, cancel, or retry independently, publishes only its complete declared output, and remains visible through the Task Center while established crop consumers receive a compatibility projection.

## Acceptance criteria

- [ ] A crop request for N selected positions creates one Operation with exactly N logical crop Tasks, including a representative 100-position request that creates 100 one-position Tasks and no monolithic crop execution path.
- [ ] Each crop Task owns only one position's output boundary, checks cancellation at safe bounded checkpoints, stages output away from its published destination, and commits atomically only after successful computation and a final cancellation check.
- [ ] Failed or cancelled crop Attempts publish no new partial position output, clean staging artifacts best-effort, and retry replaces or reuses only that logical Task's declared output without changing successful sibling positions.
- [ ] Independent position failures and cancellation leave successful siblings intact and visible, with accurate Operation counts and position context available in detail.
- [ ] Existing crop progress and latest-progress consumers are compatibility projections derived from canonical state rather than an independent scheduler or mutable source of truth.
- [ ] Starting and running cropping no longer presents a blocking progress modal or disables unrelated workflow/navigation; progress, errors, cancellation, and retry are available through the Task Center.
- [ ] Integration tests cover multi-position independence, exact 100-position decomposition, cooperative cancellation, retry, aggregate counts, atomic publication, and preservation of successful sibling output using temporary workspaces and controlled execution.
- [ ] The implementation starts from current crop and contract edits, preserves unrelated dirty-tree changes, and verifies the resulting diff before completion.
