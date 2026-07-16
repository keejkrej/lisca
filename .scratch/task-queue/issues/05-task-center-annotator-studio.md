# Expose the Task Center in Annotator and Studio shells

Status: resolved
Blocked by: 04

Source: [PRD.md](../PRD.md)

**What to build:** Reuse the same Task Center throughout the remaining product shells, placing its button with Annotator's top utility actions and at the bottom of Studio's left rail so queued, active, and recent work stays globally reachable without competing with domain controls.

## Acceptance criteria

- [x] Annotator uses the shared Task button and Task Center behavior from its top utility action area without duplicating modal or task state logic.
- [x] Studio uses the shared Task button at the bottom of its left navigation rail and keeps it available throughout the wizard, align, annotate, analyse, and result workflow states.
- [x] Empty, active, and attention-needed indicators are consistent across Aligner, Annotator, and Studio while respecting each shell's placement and styling.
- [x] Opening, inspecting, acting on, and dismissing the Task Center never replaces the current screen or forces navigation in Annotator or Studio.
- [x] Product-shell browser tests verify both placements and preserve the underlying route, workspace, selections, and current edit state across modal interaction.
