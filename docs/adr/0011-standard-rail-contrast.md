# ADR-0011: Studio Contrast stays on the standard Align and Annotate rails

- **Status:** accepted
- **Date:** 2026-10-12

## Decision

Studio Align and Annotate show the Contrast section on the standard right rail,
because contrast is adjusted on ordinary passes. Expert mode still adds Position,
Z, Geometry, and Drift on Align, and Position, ROI, and Z on Annotate.

## Why

Contrast was grouped with the expert navigation axes. Those axes stay expert.
Contrast does not, because it is used whenever a frame is on screen. Hiding it
behind the expert toggle made the common adjustment a mode switch.

Rejected alternatives:

- Leave Contrast expert-only. That is the behavior this decision replaces.
- Show Contrast only in standard mode and drop it from expert mode. Expert keeps
  the full rail, including Contrast.

## Looks like a bug when

- The standard Align or Annotate right rail has no Contrast section.
- Expert mode drops Contrast, Position, Z, Geometry, or Drift.
