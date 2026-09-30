# 01 — Run and inspect bounded Tasks fairly

**What to build:** Introduce the canonical process-global queue so backend computations can be represented as user-facing Tasks containing bounded Steps and Attempts. Independent Steps can be submitted and inspected through generated typed list/detail projections, while dispatch remains fair and predictable across Tasks and workspaces. Keep all scheduling and history process-local.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Canonical generated contracts distinguish Task, Step, and Attempt identities and expose queued, running, completed, failed, cancelled, cancellation-requested, and attention/progress information needed by later clients without hand-written wire types.
- [x] Generic task-centric list and task/step detail reads are available from each product backend and decode through shared client IO; the list includes active work plus capped recent terminal history.
- [x] A deterministic scheduler harness submits bounded fake Steps through the same public scheduler interface used by production and controls their start and completion without sleeps.
- [x] Running Step weights never exceed configurable process-global capacity, oversized or invalid weights are rejected, and safe defaults derive from available parallelism.
- [x] Runnable Tasks receive round-robin dispatch turns, while currently eligible Steps within a Task run FIFO and Steps inside an admitted Task may run concurrently within capacity.
- [x] Only one mutating Task per normalized workspace is admitted at once, while Tasks for other workspaces continue to make progress.
- [x] Oldest terminal history is evicted when the configured cap is exceeded, but active Tasks and all records needed to interpret in-flight state are retained.
- [x] Stable Task, Step, Attempt, workspace, and step-kind identifiers appear in projections and backend observability context.
- [x] Contract generation starts from the current schemas and preserves unrelated user-owned and generated-contract changes; the final diff contains no reset or blanket overwrite of pre-existing work.
