# 07 — Run gene-expression analysis as bounded fan-out/fan-in Steps

**What to build:** Migrate the gene-expression assay pipeline onto the canonical scheduler, splitting work at its natural independent units and expressing downstream aggregation through explicit dependencies. Successful branches and committed results remain authoritative when another branch fails, while established analysis consumers see a canonical compatibility projection and Studio stays non-blocking.

**Blocked by:** 03 — Cancel and retry Step attempts; 05 — Expose the Task Center in Annotator and Studio shells.

**Status:** resolved

- [x] A gene-expression Analysis Task fans out per independent position, site, time series, or other justified bounded unit and uses explicit fan-in Steps for outputs that require multiple prerequisites; no large assay is hidden inside one Step.
- [x] Aggregation starts only when every declared prerequisite has succeeded, while ready independent branches continue after an unrelated failure and expose partial progress.
- [x] Each handler declares its input and output ownership, checks cancellation at safe checkpoints, stages output away from publication, and commits atomically after success and a final cancellation check.
- [x] Failed or cancelled Attempts publish no partial new result, best-effort cleanup staging data, and retry affects only the logical Step's output boundary without overwriting successful sibling results.
- [x] Existing gene-expression analysis progress/results consumers are compatibility projections from canonical Task state and do not mutate a second job model.
- [x] Starting, running, completing, failing, cancelling, or retrying gene-expression analysis does not show a blocking progress overlay or force navigation; Task Center state remains available from Studio's rail.
- [x] Integration tests use controlled execution and temporary workspaces to verify real fan-out/fan-in decomposition, prerequisite gating, sibling continuation, retry unblocking, aggregate progress, and atomic outputs.
- [x] Current analysis and generated-contract edits are treated as source input, and a final diff check demonstrates that unrelated in-progress work was preserved.

## Answer

Studio now submits gene-expression as a canonical scheduler Task. Preparation writes
the slide mapping; segmentation fans out into one Step per position; timeseries fans in at
the slide-channel boundary; plotting and AUC/fit form explicit dependent branches; and a
final Step waits for every published result branch. Step cancellation/retry and partial
branch state therefore use the shared scheduler and Task Center. The legacy analysis
progress endpoints project that Task rather than maintaining an independent runner.

Verification includes `routes::tests::assay_tasks_expose_real_fan_out_and_fan_in_graphs`,
which asserts two position Steps and the slide-channel fan-in dependencies.
