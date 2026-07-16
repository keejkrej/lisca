# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

This repo tracks issues as local markdown, so a "label" is the `Status:` line near the top of an issue file:

```markdown
# Run cropping as one Task per position

Status: ready-for-agent
Blocked by: 03, 04
```

Issues derived from a PRD are triaged by construction — they start at `ready-for-agent`
rather than `needs-triage`. Use `resolved` once every acceptance criterion is checked.
