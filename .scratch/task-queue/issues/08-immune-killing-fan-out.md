# Run immune-killing analysis as bounded fan-out/fan-in Tasks

Status: ready-for-agent
Blocked by: 07

Source: [PRD.md](../PRD.md)

**What to build:** Apply the proven analysis scheduling pattern to the immune-killing assay pipeline, choosing its own natural bounded seams and aggregation dependencies rather than forcing gene-expression units onto a different domain. The second current assay receives the same cancellation, retry, atomic publication, compatibility, and non-blocking Task Center behavior.

## Acceptance criteria

- [ ] An immune-killing Analysis Operation decomposes into domain-appropriate bounded independent Tasks plus explicit aggregation dependencies, with no monolithic large-workload Task.
- [ ] Independent ready branches continue when a sibling fails, dependents remain explainably blocked, and successful retry can unblock downstream aggregation without double-counting progress.
- [ ] Each immune-killing handler owns a precise output boundary, cooperatively checks cancellation, stages output away from publication, commits only after successful completion and a final cancellation check, and cannot expose partial failed/cancelled output.
- [ ] Retrying an immune-killing logical Task preserves Attempt history and successful sibling output while safely replacing or reusing only its own declared result.
- [ ] Existing immune-killing analysis progress/results consumers are compatibility projections from canonical state and share the non-blocking Studio Task Center experience.
- [ ] Integration tests cover the real immune-killing graph, dependency ordering, branch failure, partial progress, cancellation, retry, atomic publication, and aggregation output using controlled execution rather than sleeps.
- [ ] Current analysis work remains intact, and the final diff contains no reset or blanket overwrite of unrelated user-owned or generated changes.
