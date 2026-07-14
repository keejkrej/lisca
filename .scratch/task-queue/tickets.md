# Tickets: Task queue and Task Center

These tickets introduce bounded backend Operations and Tasks, migrate cropping and both current analysis pipelines, and expose the work through a shared Task Center. Source: [spec.md](./spec.md).

Work the **frontier**: any ticket whose blockers are all done. Tickets are listed in dependency order.

## Working-tree safety

The repository already contains user-owned and generated work in progress. Every worker must begin from the current working tree, inspect overlapping edits before changing them, and preserve unrelated changes. Do not reset, discard, or blanket-rewrite existing work. In particular, contract generation must use the schemas present at implementation time and retain unrelated generated-contract changes; analysis migrations must treat current analysis edits as input and verify by diff that they remain intact.

## Run and inspect bounded Operations fairly

**What to build:** Introduce the canonical process-global queue so backend computations can be represented as user-facing Operations containing bounded Tasks and Attempts. Independent Tasks can be submitted and inspected through generated typed list/detail projections, while dispatch remains fair and predictable across Operations and workspaces. Keep all scheduling and history process-local.

**Blocked by:** None — can start immediately.

- [x] Canonical generated contracts distinguish Operation, Task, and Attempt identities and expose queued, running, completed, failed, cancelled, cancellation-requested, and attention/progress information needed by later clients without hand-written wire types.
- [x] Generic operation-centric list and operation/task detail reads are available from each product backend and decode through shared client IO; the list includes active work plus capped recent terminal history.
- [x] A deterministic scheduler harness submits bounded fake Tasks through the same public scheduler interface used by production and controls their start and completion without sleeps.
- [x] Running Task weights never exceed configurable process-global capacity, oversized or invalid weights are rejected, and safe defaults derive from available parallelism.
- [x] Runnable Operations receive round-robin dispatch turns, while currently eligible Tasks within an Operation run FIFO and Tasks inside an admitted Operation may run concurrently within capacity.
- [x] Only one mutating Operation per normalized workspace is admitted at once, while Operations for other workspaces continue to make progress.
- [x] Oldest terminal history is evicted when the configured cap is exceeded, but active Operations and all records needed to interpret in-flight state are retained.
- [x] Stable Operation, Task, Attempt, workspace, and task-kind identifiers appear in projections and backend observability context.
- [x] Contract generation starts from the current schemas and preserves unrelated user-owned and generated-contract changes; the final diff contains no reset or blanket overwrite of pre-existing work.

## Execute dependency graphs with partial outcomes

**What to build:** Allow an Operation to declare a directed acyclic Task graph so independent branches run as soon as their own prerequisites succeed, aggregation waits for its inputs, and a failed branch does not erase or stop useful sibling work. Inspection clearly distinguishes execution failure from dependency blocking.

**Blocked by:** Run and inspect bounded Operations fairly.

- [x] Operation creation or extension rejects cycles, missing dependencies, and dependencies outside the Operation before invalid work can run.
- [x] A Task becomes eligible only after every declared dependency completes successfully, and blocked Tasks do not head-of-line block later independent ready Tasks.
- [x] FIFO ordering applies among the Tasks that are currently eligible within an Operation.
- [x] Failure of one Task blocks only its dependents; unrelated siblings continue and their successful progress remains visible.
- [x] Operation summaries derive queued, running, partially complete, completed, failed, cancelled, and bounded progress counts from canonical Task state rather than a second mutable status.
- [x] Detail projections distinguish a Task that failed itself from one blocked by a failed dependency and expose enough dependency context to explain the block.
- [x] Deterministic graph tests cover fan-out/fan-in success, invalid graphs, sibling continuation, blocked descendants, partial aggregate progress, and ordering without relying on timing sleeps.

## Cancel and retry Task attempts

**What to build:** Let users control eligible work through generic typed cancel and retry commands. Cancellation is cooperative for running computation, immediate for work that has not started, and manual retry creates a new Attempt without losing prior outcomes or double-counting Operation progress.

**Blocked by:** Execute dependency graphs with partial outcomes.

- [ ] Generic Operation/Task cancel and Task retry commands are exposed by every product backend and consumed through shared client IO, returning the updated canonical projection or a typed invalid-transition error.
- [ ] Cancelling a queued or blocked Task prevents it from starting, while cancelling a running Task exposes cancellation-requested until its handler reaches a safe checkpoint and terminates.
- [ ] Cancelling an Operation requests cancellation for all of its non-terminal Tasks without falsely reporting that running handlers stopped immediately.
- [ ] Cancelling one Task leaves unrelated siblings alone and keeps dependents blocked unless a later successful Attempt satisfies the dependency.
- [ ] Retrying eligible failed or cancelled work creates a distinct Attempt with preserved timestamps, terminal outcome, and structured error history.
- [ ] A successful replacement Attempt can unblock dependents, and aggregate progress uses the latest applicable result without counting retries as additional logical Tasks.
- [ ] Commands are idempotent where specified and races between cancellation and successful completion settle on one valid canonical outcome.
- [ ] Deterministic tests cover queued, blocked, and running cancellation, Operation-wide and individual cancellation, cancellation/completion races, retry eligibility, preserved Attempt history, and retry-driven dependency unblocking.

## Open the shared Task Center from Aligner

**What to build:** Add a shared, centered Task Center inspired by Chrome's downloads information hierarchy and open it from a persistent Task button among Aligner's top utility actions. The default view stays compact and Operation-oriented, with optional Task/Attempt detail and immediate cancel or retry actions, while the underlying alignment workflow remains available.

**Blocked by:** Cancel and retry Task attempts.

- [ ] Shared headless state derives Operation grouping, active-before-history ordering, bounded progress, statuses, permitted actions, and restrained active/attention indicators from canonical projections.
- [ ] Snapshot reconciliation plus the existing live-update or polling infrastructure keeps list and detail state current through shared client IO without raw component fetches or a second mutable task model.
- [ ] The centered modal uses LiSCA shell, modal, typography, icon, and component primitives; it references Chrome downloads for scanability rather than branding or pixel imitation.
- [ ] The primary list summarizes Operations and does not render hundreds of child Tasks by default; detail reveals Task dependencies, Attempts, structured failures, context, and allowed actions.
- [ ] Cancel and retry actions reconcile immediately from the canonical command response and communicate invalid transitions without losing the current list/detail context.
- [ ] A persistent Aligner Task button sits with the top utility actions, remains available when no work exists, and indicates active or attention-needed work without becoming an intrusive progress overlay.
- [ ] Deterministic headless tests cover all specified aggregate states, action derivation, ordering, attention, history updates, and snapshot/event reconciliation.
- [ ] Browser coverage opens and dismisses the centered modal from Aligner and proves the current route, position, selections, and editable workflow remain intact with no blocking overlay, forced navigation, or brittle timeout.

## Expose the Task Center in Annotator and Studio shells

**What to build:** Reuse the same Task Center throughout the remaining product shells, placing its button with Annotator's top utility actions and at the bottom of Studio's left rail so queued, active, and recent work stays globally reachable without competing with domain controls.

**Blocked by:** Open the shared Task Center from Aligner.

- [ ] Annotator uses the shared Task button and Task Center behavior from its top utility action area without duplicating modal or task state logic.
- [ ] Studio uses the shared Task button at the bottom of its left navigation rail and keeps it available throughout the wizard, align, annotate, analyse, and result workflow states.
- [ ] Empty, active, and attention-needed indicators are consistent across Aligner, Annotator, and Studio while respecting each shell's placement and styling.
- [ ] Opening, inspecting, acting on, and dismissing the Task Center never replaces the current screen or forces navigation in Annotator or Studio.
- [ ] Product-shell browser tests verify both placements and preserve the underlying route, workspace, selections, and current edit state across modal interaction.

## Run cropping as one Task per position

**What to build:** Migrate crop submission to the canonical scheduler so one user Crop Operation owns exactly one bounded crop Task per selected position. Each position can finish, fail, cancel, or retry independently, publishes only its complete declared output, and remains visible through the Task Center while established crop consumers receive a compatibility projection.

**Blocked by:** Cancel and retry Task attempts; Open the shared Task Center from Aligner.

- [ ] A crop request for N selected positions creates one Operation with exactly N logical crop Tasks, including a representative 100-position request that creates 100 one-position Tasks and no monolithic crop execution path.
- [ ] Each crop Task owns only one position's output boundary, checks cancellation at safe bounded checkpoints, stages output away from its published destination, and commits atomically only after successful computation and a final cancellation check.
- [ ] Failed or cancelled crop Attempts publish no new partial position output, clean staging artifacts best-effort, and retry replaces or reuses only that logical Task's declared output without changing successful sibling positions.
- [ ] Independent position failures and cancellation leave successful siblings intact and visible, with accurate Operation counts and position context available in detail.
- [ ] Existing crop progress and latest-progress consumers are compatibility projections derived from canonical state rather than an independent scheduler or mutable source of truth.
- [ ] Starting and running cropping no longer presents a blocking progress modal or disables unrelated workflow/navigation; progress, errors, cancellation, and retry are available through the Task Center.
- [ ] Integration tests cover multi-position independence, exact 100-position decomposition, cooperative cancellation, retry, aggregate counts, atomic publication, and preservation of successful sibling output using temporary workspaces and controlled execution.
- [ ] The implementation starts from current crop and contract edits, preserves unrelated dirty-tree changes, and verifies the resulting diff before completion.

## Run gene-expression analysis as bounded fan-out/fan-in Tasks

**What to build:** Migrate the gene-expression assay pipeline onto the canonical scheduler, splitting work at its natural independent units and expressing downstream aggregation through explicit dependencies. Successful branches and committed results remain authoritative when another branch fails, while established analysis consumers see a canonical compatibility projection and Studio stays non-blocking.

**Blocked by:** Cancel and retry Task attempts; Expose the Task Center in Annotator and Studio shells.

- [ ] A gene-expression Analysis Operation fans out per independent position, site, time series, or other justified bounded unit and uses explicit fan-in Tasks for outputs that require multiple prerequisites; no large assay is hidden inside one Task.
- [ ] Aggregation starts only when every declared prerequisite has succeeded, while ready independent branches continue after an unrelated failure and expose partial progress.
- [ ] Each handler declares its input and output ownership, checks cancellation at safe checkpoints, stages output away from publication, and commits atomically after success and a final cancellation check.
- [ ] Failed or cancelled Attempts publish no partial new result, best-effort cleanup staging data, and retry affects only the logical Task's output boundary without overwriting successful sibling results.
- [ ] Existing gene-expression analysis progress/results consumers are compatibility projections from canonical Operation state and do not mutate a second job model.
- [ ] Starting, running, completing, failing, cancelling, or retrying gene-expression analysis does not show a blocking progress overlay or force navigation; Task Center state remains available from Studio's rail.
- [ ] Integration tests use controlled execution and temporary workspaces to verify real fan-out/fan-in decomposition, prerequisite gating, sibling continuation, retry unblocking, aggregate progress, and atomic outputs.
- [ ] Current analysis and generated-contract edits are treated as source input, and a final diff check demonstrates that unrelated in-progress work was preserved.

## Run immune-killing analysis as bounded fan-out/fan-in Tasks

**What to build:** Apply the proven analysis scheduling pattern to the immune-killing assay pipeline, choosing its own natural bounded seams and aggregation dependencies rather than forcing gene-expression units onto a different domain. The second current assay receives the same cancellation, retry, atomic publication, compatibility, and non-blocking Task Center behavior.

**Blocked by:** Run gene-expression analysis as bounded fan-out/fan-in Tasks.

- [ ] An immune-killing Analysis Operation decomposes into domain-appropriate bounded independent Tasks plus explicit aggregation dependencies, with no monolithic large-workload Task.
- [ ] Independent ready branches continue when a sibling fails, dependents remain explainably blocked, and successful retry can unblock downstream aggregation without double-counting progress.
- [ ] Each immune-killing handler owns a precise output boundary, cooperatively checks cancellation, stages output away from publication, commits only after successful completion and a final cancellation check, and cannot expose partial failed/cancelled output.
- [ ] Retrying an immune-killing logical Task preserves Attempt history and successful sibling output while safely replacing or reusing only its own declared result.
- [ ] Existing immune-killing analysis progress/results consumers are compatibility projections from canonical state and share the non-blocking Studio Task Center experience.
- [ ] Integration tests cover the real immune-killing graph, dependency ordering, branch failure, partial progress, cancellation, retry, atomic publication, and aggregation output using controlled execution rather than sleeps.
- [ ] Current analysis work remains intact, and the final diff contains no reset or blanket overwrite of unrelated user-owned or generated changes.
