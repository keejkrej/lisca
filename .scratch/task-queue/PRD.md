# Task queue and Task Center

Bounded backend Tasks and Steps, migrating cropping and both current analysis
pipelines onto a canonical scheduler, exposed through a shared Task Center.

Implementation issues live in [`issues/`](./issues/), numbered in dependency order.
Work the **frontier**: any issue whose blockers are all `resolved`.

## Working-tree safety

The repository already contains user-owned and generated work in progress. Every worker must begin from the current working tree, inspect overlapping edits before changing them, and preserve unrelated changes. Do not reset, discard, or blanket-rewrite existing work. In particular, contract generation must use the schemas present at implementation time and retain unrelated generated-contract changes; analysis migrations must treat current analysis edits as input and verify by diff that they remain intact.

## Problem Statement

Long-running LiSCA computations such as cropping analysis currently behave too much like a single foreground action. Large workloads can become monolithic, provide poor visibility into progress and failure, and make cancellation or retry coarse and expensive. A crop over 100 positions must not be represented as one gigantic unit of work: it should be a task composed of 100 independently schedulable one-position steps.

Users need to keep working while computation proceeds, understand what is queued or running across the product, see partial progress when only some work has completed, and recover individual failures without restarting successful work. The backend also needs explicit scheduling semantics so concurrent work is bounded, fair across workspaces, dependency-aware, and unable to publish partial step outputs as if they were complete.

## Solution

Introduce two related concepts:

- A **Task** is the user-facing aggregate created by an action such as “crop these 100 positions” or “run this analysis.” It owns overall progress, status, and the step graph required to produce the requested result.
- A **Step** is a bounded backend execution unit. Steps may depend on other steps, run independently when their dependencies are satisfied, and produce their outputs atomically. Cropping creates one step per position. Other analyses split at their natural fan-out and fan-in seams and must never collapse a large workload into a monolithic step.

The backend will provide a process-global queue with a weighted running-Step capacity. Runnable Tasks are selected round-robin, while Steps remain FIFO within each Task. Steps belonging to the admitted Task may run concurrently up to the shared capacity, but only one mutating Task may be admitted per workspace at a time. Dependencies block only the steps that require them, so sibling branches can continue and expose partial aggregate progress. Users can cooperatively cancel tasks or steps and can manually retry failed or cancelled work as a new attempt without discarding prior attempt history.

Expose the system through a typed generic steps API for listing, inspecting, cancelling, and retrying work. Present it in a centered Task Center modal inspired by Chrome’s downloads surface: a persistent, lightweight step button opens a scannable list of tasks and their step progress, errors, available actions, and recent history. Place the button among the top utility actions in Aligner and Annotator, and at the bottom of Studio’s left rail. Long-running work must not introduce blocking progress overlays or force navigation away from the user’s current workflow.

## User Stories

1. As a LiSCA user, I want a long-running computation to continue in the background, so that I can keep working elsewhere in the product.
2. As a LiSCA user, I want one visible task for the action I initiated, so that I can understand progress without reasoning about backend implementation details.
3. As a LiSCA user, I want to open a Task Center from the application shell, so that running and recent work is available from anywhere in the current product.
4. As an Aligner user, I want the step button with the top utility actions, so that background work is visible without competing with alignment controls.
5. As an Annotator user, I want the step button with the top utility actions, so that I can inspect computation while continuing annotation.
6. As a Studio user, I want the step button at the bottom of the left rail, so that it remains globally available throughout the assay workflow.
7. As a LiSCA user, I want the Task Center to open as a centered modal, so that I can inspect work without leaving my current screen.
8. As a LiSCA user, I want the Task Center to feel familiar to Chrome’s downloads surface, so that queued, active, completed, and failed items are quickly scannable.
9. As a LiSCA user, I want the step button to indicate active or attention-needed work, so that I know when opening the Task Center is useful.
10. As a LiSCA user, I want to see whether a task is queued, running, partially complete, completed, failed, or cancelled, so that its current state is unambiguous.
11. As a LiSCA user, I want to see completed work versus total work for a task, so that large computations have meaningful progress.
12. As a LiSCA user, I want partial sibling progress to remain visible when another step fails, so that successful work is not hidden or discarded.
13. As a LiSCA user, I want a step blocked by a failed dependency to be distinguishable from a step that failed itself, so that I understand why work did not run.
14. As a LiSCA user, I want independent branches of a task to keep running after an unrelated sibling failure, so that one bad position does not unnecessarily stop all useful work.
15. As a LiSCA user, I want a crop over many positions to progress position by position, so that the workload remains responsive and recoverable.
16. As a LiSCA user, I want a 100-position crop to become 100 one-position steps, so that each position can succeed, fail, cancel, or retry independently.
17. As a LiSCA user, I want analysis workloads split at meaningful stages, so that progress corresponds to understandable units of computation.
18. As a LiSCA user, I want downstream aggregation to wait for its prerequisites, so that it never consumes incomplete inputs.
19. As a LiSCA user, I want independent ready steps to run when their own dependencies are satisfied, so that unrelated work is not held behind a blocked branch.
20. As a LiSCA user, I want to cancel work I no longer need, so that backend capacity is not wasted.
21. As a LiSCA user, I want cancellation to be cooperative, so that running computation can stop at safe checkpoints without corrupting outputs.
22. As a LiSCA user, I want queued work to cancel before it starts, so that an unwanted step does not consume a worker slot.
23. As a LiSCA user, I want to see that cancellation has been requested while a step reaches a safe stop, so that the UI does not falsely claim it stopped immediately.
24. As a LiSCA user, I want to retry failed or cancelled work manually, so that transient problems can be recovered without restarting successful siblings.
25. As a LiSCA user, I want a retry to create a distinct attempt, so that prior errors and the current execution are not conflated.
26. As a LiSCA user, I want task progress to account for the latest applicable attempt, so that retrying work produces an accurate aggregate state.
27. As a LiSCA user, I want completed outputs to appear only after they are fully committed, so that downstream workflows never observe half-written results.
28. As a LiSCA user, I want failed or cancelled attempts not to publish incomplete outputs, so that my project remains consistent.
29. As a LiSCA user, I want separate tasks to make fair progress, so that one large experiment cannot starve all others.
30. As a LiSCA user, I want only one mutating task admitted for a workspace at once, so that unrelated tasks cannot race on shared workspace state.
31. As a LiSCA user, I want ready steps within a task to run in submission order, so that execution is predictable.
32. As a LiSCA user, I want blocked steps skipped until their dependencies are ready, so that ready steps behind them can still make progress.
33. As a LiSCA user, I want the queue to survive normal interaction and navigation within the running application process, so that background work remains stable while I use the UI.
34. As a LiSCA user, I want recent task history available during the current backend process, so that I can review what just happened.
35. As a LiSCA user, I want old process-local history bounded, so that the Task Center and backend memory do not grow indefinitely.
36. As a LiSCA user, I want current in-flight work retained regardless of the history cap, so that active tasks cannot disappear from view.
37. As a LiSCA user, I want useful failure messages and step context in the Task Center, so that I can decide whether to retry or change the input.
38. As a LiSCA user, I want to inspect the constituent steps of a task when needed, so that I can identify the exact position or analysis stage that failed.
39. As a LiSCA user, I want the default view summarized by task, so that a large fan-out does not overwhelm the Task Center with hundreds of rows.
40. As a LiSCA user, I want the Task Center to preserve the current page and selections when it opens and closes, so that checking progress is non-disruptive.
41. As a LiSCA user, I want no blocking progress overlay for queued computation, so that long-running work does not freeze my workflow.
42. As a LiSCA user, I want no forced navigation when work starts, completes, or fails, so that I remain in control of my current context.
43. As a frontend developer, I want generated typed step contracts, so that all products consume the same status and action model without hand-written wire types.
44. As a frontend developer, I want a generic list endpoint, so that the Task Center can display work without knowing every computation type.
45. As a frontend developer, I want a generic step or task detail endpoint, so that drill-down can show attempts, dependencies, progress, and errors.
46. As a frontend developer, I want generic cancel and retry commands, so that the Task Center does not require task-specific action APIs.
47. As a product developer, I want compatibility projections for existing progress consumers, so that the step system can be introduced without breaking established UI flows.
48. As a backend developer, I want step handlers to declare bounded work and dependencies, so that scheduling policy is independent of computation implementations.
49. As a backend developer, I want a single atomic output contract for step handlers, so that success means durable, complete publication and failure means no published partial result.
50. As a backend developer, I want cancellation checks available at natural computation checkpoints, so that handlers can stop promptly and safely.
51. As a backend developer, I want scheduler policy testable without running expensive image analysis, so that fairness, ordering, and dependency behavior can be verified deterministically.
52. As a backend developer, I want computation handlers testable without the live scheduler, so that step execution and output behavior can be validated independently.
53. As a QA engineer, I want deterministic control over step completion, failure, cancellation, and retry, so that Task Center states can be exercised reliably.
54. As a QA engineer, I want to verify cross-workspace fairness through public behavior, so that scheduler regressions do not starve experiments.
55. As a QA engineer, I want to verify the application remains interactive while work runs, so that blocking overlays or accidental navigation do not regress into the product.

## Implementation Decisions

- **Domain model:** A Task is the aggregate requested by a user. A Step is a bounded execution unit owned by a task. A Step Attempt records an individual execution of a step; manual retry creates another attempt rather than overwriting the prior one.
- **Bounded granularity:** Step definitions must represent bounded work. Cropping is exactly one step per position. A 100-position crop therefore creates 100 sibling crop steps under one task.
- **Analysis decomposition:** Analysis tasks split at natural fan-out and fan-in seams. Per-position, per-site, per-time-series, or similarly independent work should fan out; aggregation steps should fan in through explicit dependencies. Large analyses must never be submitted as a single monolithic step merely to simplify orchestration.
- **Dependency graph:** Each task owns a directed acyclic graph of steps. A step becomes ready only when all required dependencies have completed successfully. Cycles and references to invalid dependencies are rejected when the graph is created or extended.
- **Partial progress:** A failed step blocks its dependents but does not implicitly fail or cancel independent siblings. Other ready branches continue, and the task exposes partial progress plus the failed and blocked portions.
- **Queue scope:** The scheduler and its history are process-global within a backend process. All workspaces served by that process participate in the same scheduling policy.
- **Workspace exclusivity:** At most one mutating Task may be admitted for a given normalized workspace. Steps within that admitted Task may run concurrently up to the configured global execution capacity. A second mutating Task for the same workspace remains queued until the admitted Task is terminal.
- **Fair scheduling:** Runnable Tasks are selected round-robin so a Task with a large backlog cannot monopolize dispatch. Each Step declares an integer resource weight; the sum of running weights may not exceed a process-global capacity that defaults from available parallelism and can be configured by the backend.
- **Within-task ordering:** Ready Steps within a Task are FIFO by enqueue order. Blocked Steps do not prevent later independent ready Steps from running; FIFO applies among currently eligible Steps.
- **Step lifecycle:** The model distinguishes at least queued, blocked, running, cancellation-requested, completed, failed, and cancelled execution states. Aggregate task state is derived from its steps and their applicable attempts rather than maintained as an unrelated source of truth.
- **Cancellation:** Cancellation is cooperative. Queued or blocked work can transition to cancelled without executing. Running handlers receive a cancellation signal and are responsible for checking it at safe, bounded checkpoints before terminating. The system exposes cancellation-requested while that shutdown is pending.
- **Cancellation propagation:** Cancelling a task requests cancellation for all non-terminal steps belonging to it. Cancelling an individual step affects that step and leaves unrelated siblings alone; dependents remain blocked unless a later successful retry satisfies their dependency.
- **Manual retry:** Retry is an explicit user action available for eligible failed or cancelled work. It creates a new attempt linked to the same logical step, preserves attempt history, and allows dependents to become ready after the retry succeeds. Automatic infinite retry is not part of the model.
- **Attempts and aggregates:** Attempt history includes timestamps, terminal outcome, and a structured error where applicable. The logical step’s current result is derived from its successful or latest applicable attempt, and task progress must not double-count retries.
- **Atomic output contract:** A step handler stages its output away from the published destination and commits it atomically only after successful computation and a final cancellation check. Completed means the full step output is published. Failed or cancelled attempts leave no newly published partial output and clean up staging artifacts on a best-effort basis.
- **Idempotency boundary:** Retrying a logical step must safely replace or reuse its own declared output boundary without altering successful sibling outputs. Each handler declares the inputs and output ownership required to enforce this boundary.
- **History retention:** Step and task history is retained only for the lifetime of the backend process and is capped. Terminal historical records are evicted oldest-first when the cap is exceeded. Active tasks, non-terminal steps, dependency data required by active work, and the attempts necessary to interpret their current state are never evicted.
- **Restart behavior:** Durable queue recovery across backend restarts is not required. After a process restart, only outputs that were atomically committed by completed steps remain authoritative; prior in-memory queue and history records are absent.
- **Typed API:** Add generic, schema-derived contracts for listing tasks/steps, retrieving aggregate or detailed step state, cancelling eligible work, and retrying eligible work. Wire types are generated from the shared contract source and consumed through shared client IO rather than hand-written request types or raw component fetches.
- **List projection:** The list response is task-centric by default and includes enough summary data for the Task Center: identity, kind, workspace context, aggregate state, bounded progress counts, creation/update times, attention state, and permitted actions. It supports retrieving active work plus the capped recent terminal history.
- **Detail projection:** Detail responses expose step units, dependency and blocked-state information, attempts, structured failures, and allowed actions. Computation-specific metadata may be carried through typed discriminated details while the surrounding API remains generic.
- **Command semantics:** Cancel and retry commands validate current state, are idempotent where practical, and return the updated canonical projection so clients can reconcile immediately. Invalid transitions return typed errors rather than silently doing nothing.
- **Compatibility:** Existing product-specific progress or job representations may remain as compatibility projections derived from the canonical task/step model during migration. They must not become a second scheduler or independent mutable source of truth.
- **Task Center:** Build a shared, centered Task Center modal inspired by Chrome downloads. The primary list is compact and task-oriented, with clear status, progress, recency, error/attention treatment, and contextual cancel or retry actions. Users can expand or open details to inspect bounded steps and attempts without rendering every child step by default.
- **Step button placement:** Aligner and Annotator place the Task Center button in their top utility action area. Studio places it at the bottom of the left navigation rail. The button uses the shared Task Center behavior and product shell styling while respecting these different shell placements.
- **Button state:** The step button remains available regardless of whether work exists and provides a restrained indicator for active work or failures needing attention. It must not become an intrusive global progress overlay.
- **Non-blocking interaction:** Starting, running, completing, failing, cancelling, or retrying background work must not force route changes. The Task Center is dismissible, preserves the underlying screen state, and does not replace existing screens with blocking progress UI.
- **Updates:** The Task Center consumes the canonical step projections through the shared client layer. Live update transport may reuse the existing backend event or WebSocket infrastructure, with reconciliation against the typed list/detail API so missed events do not leave stale state.
- **Observability:** Step records and backend logs carry stable task, step, attempt, workspace, and step-kind identifiers so failures and scheduling behavior can be traced without exposing internal handler state as public API.
- **Capacity:** Global weighted capacity, per-Step resource weights, and the process history cap are backend configuration concerns with safe defaults. The initial user experience does not require an administrative UI for them.

## Testing Decisions

- Tests assert externally observable state transitions, ordering, published outputs, API projections, and user interactions. They must not couple to scheduler data structures, polling loop details, component internals, or exact timing.
- The highest backend seam is a scheduler harness using fake bounded step handlers, a controllable executor/clock, and isolated temporary workspaces. Through the same public enqueue, cancel, retry, and query interfaces used by production, it verifies workspace Task exclusivity, global weighted capacity, round-robin Task fairness, FIFO among ready Steps, dependency blocking, sibling continuation, and history eviction.
- Scheduler tests use explicit barriers or controlled completions instead of sleeps. They prove that Steps inside one admitted Task can run concurrently within capacity, a second mutating Task for the same workspace waits, Tasks for other workspaces can make progress, a large backlog cannot starve another Task, and blocked Steps do not head-of-line block independent ready work.
- Graph tests cover valid fan-out/fan-in tasks, cycle rejection, invalid dependency rejection, dependency success, dependency failure, blocked descendants, partial sibling progress, and a successful retry unblocking downstream work.
- Cancellation tests cover queued cancellation, blocked cancellation, running cancellation-requested state, cooperative handler termination, task-wide cancellation, individual-step cancellation, and cancellation racing with successful completion.
- Retry tests cover transition eligibility, preservation of prior attempts, no double-counting in progress, repeated command idempotency where supported, and dependents becoming ready only after a successful replacement attempt.
- Atomic-output integration tests run representative step handlers against temporary storage. They verify that only a successful step publishes output, cancellation and failure expose no partial published result, an existing successful sibling output remains intact, and retry owns only the logical step’s declared output boundary.
- Cropping integration tests create a multi-position crop task and assert one step per position, independent position outcomes, accurate aggregate counts, and no monolithic crop execution path. A representative 100-position case verifies the graph contains 100 bounded crop steps without requiring expensive real image processing.
- Analysis integration tests use at least one real fan-out/fan-in pipeline and assert that independent units execute separately, aggregation waits for all declared prerequisites, and failure of one branch does not erase successful siblings.
- Contract tests validate generated schemas and representative list, detail, cancel, retry, typed error, dependency, attempt, and aggregate-state payloads. Shared client tests cover decoding and state reconciliation through the public client IO layer.
- Compatibility tests, where existing progress projections remain, verify they are derived from canonical task/step state and reflect completion, failure, cancellation, and retry without independent mutation.
- Task Center headless/state tests cover grouping by task, status and progress derivation, allowed actions, ordering active work before recent history, attention indicators, capped-history updates, and reconciliation of live events with API snapshots.
- Product-shell browser tests verify the button placement in Aligner and Annotator top utilities and Studio’s lower left rail, opening and dismissing the centered modal, inspecting details, cancelling, retrying, and preserving the underlying route and selections.
- Browser tests run with deterministic fake step endpoints or controllable backend handlers to exercise queued, blocked, running, partially complete, completed, failed, cancellation-requested, cancelled, and retried states without brittle timeouts.
- A non-blocking workflow test starts long-running work, navigates or continues editing in the underlying product, opens and closes the Task Center, and confirms no blocking overlay or forced navigation occurs.
- Existing backend API, step-like execution, shell modal, live-update, and shared headless-state test patterns should be reused where present. New seams should be introduced only where current code cannot control scheduling and computation deterministically; the preferred new seam is the single public scheduler harness rather than handler-specific mocks scattered across products.

## Out of Scope

- Persisting or restoring queue state and task history across backend process restarts.
- A distributed queue, multi-process scheduler coordination, remote workers, or cross-machine execution.
- Running more than one mutating Task concurrently within the same workspace.
- An administrative UI for changing worker capacity, Step weights, or the history cap.
- Automatic retry policies, exponential backoff, or retrying indefinitely without user action.
- Pausing and resuming a running step from an intermediate computation checkpoint.
- Reprioritizing, dragging, or manually reordering queued steps in the Task Center.
- Treating every inner loop iteration as a separate step; decomposition stops at bounded, natural computation seams.
- Retrofitting short, immediate interactions that do not benefit from background execution.
- Blocking progress screens, forced navigation to a step page, or a full-page task-management route.
- Durable retention, export, or audit reporting of historical step attempts.
- Replacing the product-specific result views; the Task Center reports execution status and links contextually where appropriate but is not the analysis result viewer.

## Further Notes

- Weighted capacity and round-robin/FIFO are complementary: runnable Tasks take round-robin dispatch turns, eligible Steps within a Task are FIFO, and each running Step consumes its declared resource weight.
- “Workspace-exclusive” applies to admission of mutating Tasks, not to every Step inside the admitted Task and not to UI use. A user may continue viewing and editing where existing product rules allow; step handlers must own clearly defined mutation/output boundaries.
- Task progress should favor bounded counts such as completed steps out of total steps. Optional per-step fractional progress can enrich the display but must not be required for correctness or used to justify oversized steps.
- The Task Center’s Chrome-downloads reference is an interaction and information-hierarchy reference, not a request to reproduce Chrome branding or pixel styling. The implementation should use LiSCA’s shared shell, modal, typography, colors, icons, and component primitives.
- Terminology should remain consistent in code and UI documentation: Task for the user request/aggregate, Step for one bounded unit, Attempt for one execution of a step, and Queue for scheduler-owned eligible or waiting work.
