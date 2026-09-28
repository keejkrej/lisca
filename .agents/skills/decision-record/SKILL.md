---
name: decision-record
description: >-
  Record a shipped choice in docs/adr/ when a later collaborator could not
  recover the reason from the code. Use when finishing a behavior-changing
  implementation, when a report might be intended behavior, or when reversing
  an accepted decision.
---

# Decision record

`docs/adr/` is how a collaborator learns why a shipped choice looks the way it does. The agent writes the record in the same change. When the repo keeps a glossary in `CONTEXT.md`, terms stay there. This skill writes decisions only.

## Bar

Write an ADR when both are true:

1. This slice ships a choice: a prompt constraint, a rejected alternative, or behavior the diff encodes.
2. A later reader cannot recover the reason from the code, and would redo or undo the choice.

Otherwise the result is **N/A**. A bugfix, rename, formatting change, or behavior-preserving refactor is N/A.

Ask one question only when the slice might be a choice or a defect and the prompt does not say which. Until that is known, status is `proposed`. Shipping the choice makes status `accepted`.

## Modes

| Mode          | When                                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Consult**   | Before changing behavior in an area that may already have a record. Read the matching files in `docs/adr/`.                                                                               |
| **Harvest**   | Finishing an implementation that changes behavior. Recovering a choice from commit or PR history uses this mode too: write it only when the bar is met and the code still has the choice. |
| **Supersede** | This change reverses an accepted ADR.                                                                                                                                                     |

An accepted ADR that matches a "this looks wrong" report is the explanation. Cite it. A report that contradicts an accepted ADR is a defect: fix it, or file it where this repo tracks defects. When `docs/agents/issue-tracker.md` exists, follow it.

## Write

Next id is the highest `NNNN` in `docs/adr/` plus one, four digits. Create `docs/adr/` on the first record. Add one row to the index in `docs/adr/README.md`. When that file is missing, create it with this body and then add the row:

```markdown
# Architecture Decision Records

Why a shipped choice looks the way it does. Agents write these during the change. The procedure is the `decision-record` skill.

| Status       | Meaning                                                    |
| ------------ | ---------------------------------------------------------- |
| `accepted`   | Current choice. Matching behavior is intended.             |
| `proposed`   | Not yet confirmed. Matching behavior is not protected.     |
| `superseded` | Replaced. The old file stays, and it links to the new ADR. |

## Index

| ID  | Status | Title |
| --- | ------ | ----- |
```

```markdown
# ADR-NNNN: <title>

- **Status:** accepted
- **Date:** YYYY-MM-DD

## Decision

One sentence: we will <choice>, because <reason>.

## Why

The trade-off the code does not show. Name the rejected alternative when there was one.

## Looks like a bug when

The report a collaborator would file if this record did not exist.
```

To supersede: write the new ADR as `accepted`, set the old file's status to `superseded`, and add **Superseded by:** ADR-NNNN on the old file. Leave the old Decision text in place. Update both index rows.

## Done

Harvest is done when the change contains the new or updated ADR, or the reply states **N/A**. A supersede is in the same change as the code that reverses the old choice. The reply names the ADR path or **N/A**.
