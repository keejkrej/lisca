# Run gene-expression analysis as bounded fan-out/fan-in Tasks

Status: ready-for-agent
Blocked by: 03, 05

Source: [PRD.md](../PRD.md)

**What to build:** Migrate the gene-expression assay pipeline onto the canonical scheduler, splitting work at its natural independent units and expressing downstream aggregation through explicit dependencies. Successful branches and committed results remain authoritative when another branch fails, while established analysis consumers see a canonical compatibility projection and Studio stays non-blocking.

## Acceptance criteria

- [ ] A gene-expression Analysis Operation fans out per independent position, site, time series, or other justified bounded unit and uses explicit fan-in Tasks for outputs that require multiple prerequisites; no large assay is hidden inside one Task.
- [ ] Aggregation starts only when every declared prerequisite has succeeded, while ready independent branches continue after an unrelated failure and expose partial progress.
- [ ] Each handler declares its input and output ownership, checks cancellation at safe checkpoints, stages output away from publication, and commits atomically after success and a final cancellation check.
- [ ] Failed or cancelled Attempts publish no partial new result, best-effort cleanup staging data, and retry affects only the logical Task's output boundary without overwriting successful sibling results.
- [ ] Existing gene-expression analysis progress/results consumers are compatibility projections from canonical Operation state and do not mutate a second job model.
- [ ] Starting, running, completing, failing, cancelling, or retrying gene-expression analysis does not show a blocking progress overlay or force navigation; Task Center state remains available from Studio's rail.
- [ ] Integration tests use controlled execution and temporary workspaces to verify real fan-out/fan-in decomposition, prerequisite gating, sibling continuation, retry unblocking, aggregate progress, and atomic outputs.
- [ ] Current analysis and generated-contract edits are treated as source input, and a final diff check demonstrates that unrelated in-progress work was preserved.
