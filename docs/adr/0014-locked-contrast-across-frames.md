# ADR-0014: Auto contrast follows each frame unless the viewer locks the window

- **Status:** accepted
- **Date:** 2026-10-15

## Decision

Align and Annotate load each frame at the source's raw intensity domain when the user has not
pinned a window. **Auto** applies that frame's percentile suggestion and locks it, and a **Lock**
toggle keeps the current Min/Max across frame changes because stepping through a movie or a set of
ROIs is only useful when the same intensities map to the same gray levels. Contrast is display-only.

## Why

The server applies contrast while reading the frame, so the pixels on the canvas are already
windowed. Every frame carries a percentile suggestion (`suggestedContrast`) and the full domain.
A request that omits a window uses the domain (raw). Auto or a manual window is a separate frame
request. The viewer therefore has three sources of truth to reconcile — the requested window, the
window the frame was rendered with (`appliedContrast`), and the sliders. Loading auto-stretched
killing frames hid dim signal; dragging Min/Max without Lock only changed the current frame.

The lock is a plain `contrastLocked` flag next to `contrast`, not a second window and not a
persisted preference. Rejected alternatives:

- Always keep the manual window across frames. It removes the way back to raw except dragging.
- Apply percentile auto on load. Bright death-reporter pixels stretch the window and the rest
  of the movie looks worse than the microscope's raw display.
- Materialize the window when Lock is pressed. It changes `contrast`, which re-requests the
  frame and shows a loading pass for a window that is already on screen. Instead the window is
  resolved when the frame changes: `contrastForFrameChange` returns `null` (raw domain) when
  unlocked and the pinned window — or the outgoing frame's window when the user has not set
  one — when locked. Auto and Min/Max commit also turn Lock on so a chosen window applies to
  every frame.
- Persist the flag in the session record. The window itself is not persisted, so a restored
  `true` would describe a lock with nothing to pin and read as locked while behaving auto.
  `contrastLocked` resets with the frame it belongs to: source/workspace changes clear it.

Unlocking does not rewrite the current window. It stays on screen and the next frame change
returns to that frame's raw domain.

## Looks like a bug when

- Changing frames drops a window the user locked, or keeps it while Lock is off.
- Pressing Lock reloads the frame or produces a visible loading pass.
- Lock is an icon-only button instead of a labelled state toggle like Edit and Show.
- Contrast stays locked after the source or workspace changes.
- Killing or transfection loads a percentile-stretched frame before the user presses Auto.
- Dragging Min/Max or pressing Auto changes only the current frame.

Related: [ADR-0011](0011-standard-rail-contrast.md) puts Contrast on the standard rail, which is
where this toggle lives.
