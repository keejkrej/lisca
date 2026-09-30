# 02 — Execute dependency graphs with partial outcomes

**What to build:** Allow a Task to declare a directed acyclic Step graph so independent branches run as soon as their own prerequisites succeed, aggregation waits for its inputs, and a failed branch does not erase or stop useful sibling work. Inspection clearly distinguishes execution failure from dependency blocking.

**Blocked by:** 01 — Run and inspect bounded Tasks fairly.

**Status:** resolved

- [x] Task creation or extension rejects cycles, missing dependencies, and dependencies outside the Task before invalid work can run.
- [x] A Step becomes eligible only after every declared dependency completes successfully, and blocked Steps do not head-of-line block later independent ready Steps.
- [x] FIFO ordering applies among the Steps that are currently eligible within a Task.
- [x] Failure of one Step blocks only its dependents; unrelated siblings continue and their successful progress remains visible.
- [x] Task summaries derive queued, running, partially complete, completed, failed, cancelled, and bounded progress counts from canonical Step state rather than a second mutable status.
- [x] Detail projections distinguish a Step that failed itself from one blocked by a failed dependency and expose enough dependency context to explain the block.
- [x] Deterministic graph tests cover fan-out/fan-in success, invalid graphs, sibling continuation, blocked descendants, partial aggregate progress, and ordering without relying on timing sleeps.
