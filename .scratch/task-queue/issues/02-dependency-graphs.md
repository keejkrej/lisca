# 02 — Execute dependency graphs with partial outcomes

**What to build:** Allow an Operation to declare a directed acyclic Task graph so independent branches run as soon as their own prerequisites succeed, aggregation waits for its inputs, and a failed branch does not erase or stop useful sibling work. Inspection clearly distinguishes execution failure from dependency blocking.

**Blocked by:** 01 — Run and inspect bounded Operations fairly.

**Status:** resolved

- [x] Operation creation or extension rejects cycles, missing dependencies, and dependencies outside the Operation before invalid work can run.
- [x] A Task becomes eligible only after every declared dependency completes successfully, and blocked Tasks do not head-of-line block later independent ready Tasks.
- [x] FIFO ordering applies among the Tasks that are currently eligible within an Operation.
- [x] Failure of one Task blocks only its dependents; unrelated siblings continue and their successful progress remains visible.
- [x] Operation summaries derive queued, running, partially complete, completed, failed, cancelled, and bounded progress counts from canonical Task state rather than a second mutable status.
- [x] Detail projections distinguish a Task that failed itself from one blocked by a failed dependency and expose enough dependency context to explain the block.
- [x] Deterministic graph tests cover fan-out/fan-in success, invalid graphs, sibling continuation, blocked descendants, partial aggregate progress, and ordering without relying on timing sleeps.
