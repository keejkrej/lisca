# ADR-0021: Auto-detect grid is a preview control

- **Status:** accepted
- **Date:** 2026-11-05

## Decision

We will expose micropattern-lattice detection as the Aligner **Auto-detect**
control, because humans and agents should share one action: run `detect.rs` on
the current frame, load the lattice into the editable Align session, and leave
persist to **Save bbox**.

`POST /align/detect-grid` is that control's backend. It returns
`AlignGridState` plus confidence and residual. It does not write
`bbox/Pos{n}.csv` or `align/Pos{n}.json`.

## Why

Detection is a first guess. Crowded, faint, or off-shape frames need a review
and the usual pointer gestures before ROI boxes are committed. A detect-and-save
shortcut would hide that step.

The rejected alternative is an agent-only path that writes alignment files
without the canvas (`cli_align` with `apply=true` on PR #208). That bypasses the
control a human uses. MCP already catalogs every HttpApi operation, so
`align_detect_grid` is the same backend the button calls. Binding MCP to the
live Auto-detect control so the overlay updates in the running webview is a
follow-up; retiring `cli_align --apply` in favour of Auto-detect then Save is
the same follow-up.

## Looks like a bug when

- "Auto-detect did not create `bbox/Pos{n}.csv`" — intended. Save bbox still
  writes the ROI boxes after the user (or agent) reviews the overlay.
- "MCP `align_detect_grid` did not move the grid on the Aligner canvas" —
  intended until MCP invokes the live UI control. Today's contract tools hit the
  backend (ADR-0019). Use the Auto-detect button, or apply the returned grid
  through Save bbox only after review.
