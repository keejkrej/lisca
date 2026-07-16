# Run and inspect bounded Operations fairly

Status: resolved
Blocked by: None

Source: [PRD.md](../PRD.md)

**What to build:** Introduce the canonical process-global queue so backend computations can be represented as user-facing Operations containing bounded Tasks and Attempts. Independent Tasks can be submitted and inspected through generated typed list/detail projections, while dispatch remains fair and predictable across Operations and workspaces. Keep all scheduling and history process-local.

## Acceptance criteria

- [x] Canonical generated contracts distinguish Operation, Task, and Attempt identities and expose queued, running, completed, failed, cancelled, cancellation-requested, and attention/progress information needed by later clients without hand-written wire types.
- [x] Generic operation-centric list and operation/task detail reads are available from each product backend and decode through shared client IO; the list includes active work plus capped recent terminal history.
- [x] A deterministic scheduler harness submits bounded fake Tasks through the same public scheduler interface used by production and controls their start and completion without sleeps.
- [x] Running Task weights never exceed configurable process-global capacity, oversized or invalid weights are rejected, and safe defaults derive from available parallelism.
- [x] Runnable Operations receive round-robin dispatch turns, while currently eligible Tasks within an Operation run FIFO and Tasks inside an admitted Operation may run concurrently within capacity.
- [x] Only one mutating Operation per normalized workspace is admitted at once, while Operations for other workspaces continue to make progress.
- [x] Oldest terminal history is evicted when the configured cap is exceeded, but active Operations and all records needed to interpret in-flight state are retained.
- [x] Stable Operation, Task, Attempt, workspace, and task-kind identifiers appear in projections and backend observability context.
- [x] Contract generation starts from the current schemas and preserves unrelated user-owned and generated-contract changes; the final diff contains no reset or blanket overwrite of pre-existing work.
