# 03 — Cancel and retry Task attempts

**What to build:** Let users control eligible work through generic typed cancel and retry commands. Cancellation is cooperative for running computation, immediate for work that has not started, and manual retry creates a new Attempt without losing prior outcomes or double-counting Operation progress.

**Blocked by:** 02 — Execute dependency graphs with partial outcomes.

**Status:** resolved

- [x] Generic Operation/Task cancel and Task retry commands are exposed by every product backend and consumed through shared client IO, returning the updated canonical projection or a typed invalid-transition error.
- [x] Cancelling a queued or blocked Task prevents it from starting, while cancelling a running Task exposes cancellation-requested until its handler reaches a safe checkpoint and terminates.
- [x] Cancelling an Operation requests cancellation for all of its non-terminal Tasks without falsely reporting that running handlers stopped immediately.
- [x] Cancelling one Task leaves unrelated siblings alone and keeps dependents blocked unless a later successful Attempt satisfies the dependency.
- [x] Retrying eligible failed or cancelled work creates a distinct Attempt with preserved timestamps, terminal outcome, and structured error history.
- [x] A successful replacement Attempt can unblock dependents, and aggregate progress uses the latest applicable result without counting retries as additional logical Tasks.
- [x] Commands are idempotent where specified and races between cancellation and successful completion settle on one valid canonical outcome.
- [x] Deterministic tests cover queued, blocked, and running cancellation, Operation-wide and individual cancellation, cancellation/completion races, retry eligibility, preserved Attempt history, and retry-driven dependency unblocking.
