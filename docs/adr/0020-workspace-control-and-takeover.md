# ADR-0020: One workspace writer with explicit human takeover

- **Status:** accepted
- **Date:** 2026-11-05

## Decision

Desktop Studio serializes mutations per workspace and gives agent sessions an
explicit ownership lifecycle. Both webview IPC and desktop MCP pass through the
same `ControlCenter` middleware in `crates/lisca-tauri`.

The lifecycle is:

```text
HumanControl → AgentRunning ⇄ AgentPaused
                     ↕
               UserTakeover
```

Reads remain concurrent. While an agent session owns a workspace, human writes
are rejected until the user chooses **Take over**. While the user has control,
agent writes fail with `control_with_user` until the user chooses **Hand back**.
Only one mutation may be active at a time; concurrent mutations receive
`409 workspace_busy`.

The app shell shows a persistent activity indicator during agent ownership with
the current operation, progress, **Pause**, **Take over**, **Stop**, and
**Hand back** controls. MCP exposes read-only `control_status` so agents can
observe ownership and revision changes without being able to grant control to
themselves.

## Why

Embedding MCP in the desktop process removed the two-backend state split but not
races between two actors. A user saving an annotation while an agent recrops or
relabels the same ROI would otherwise silently lose work. Computer-use UX
references (Magentic-UI co-tasking, Claude Code session control, and Cua's
host-driven activity model) consistently make ownership visible and provide a
human takeover path rather than allowing simultaneous writers.

## Mechanics

- `ControlCenter` wraps the same embedded Axum router used by IPC and MCP. MCP
  requests carry an internal agent marker; the marker is not a permission grant.
- Short writes hold an operation until their response finishes. Crop and
  analysis operations remain active while a watcher polls their existing
  progress routes.
- Pause, takeover, and stop cancel an active long operation through its existing
  cancellation route and wait for terminal progress before releasing it. The
  scheduler remains responsible for task execution and mutual exclusion of long
  mutating tasks.
- Finishing one operation does not silently end the agent session. **Stop**
  releases it; **Hand back** explicitly returns control after user edits.
- Every mutation and control transition increments a workspace revision exposed
  through `control_status`.

## Current limits

Pause is a safe stop of the active long operation, not a checkpoint/resume of a
partial crop or analysis. A later operation starts a new task. Crop output is
not yet staged as an immutable generation, and document writes do not yet
require `expectedRevision`; revision reporting is present so clients can detect
changes, but compare-and-save belongs in the next increment. The indicator
polls once per second rather than using an event stream.

## Looks like a bug when

- UI and MCP can mutate the same workspace concurrently.
- A finished operation silently releases an agent session and lets a later
  agent write overwrite an intervening human edit without an explicit handback.
- Takeover or stop returns while the cancelled task is still producing output.
- The agent can pause, take over, stop, or resume its own ownership through MCP.
- Agent activity is invisible outside the workflow currently on screen.
