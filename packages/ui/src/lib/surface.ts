/**
 * Brand surface tiers (appearance tokens):
 *
 * - **shell** (`shellChromeClass`): AppShell regions and viewport padding share `bg-background`
 * - **panel** (`surfacePanelClass`): dock sections, viewport inner frame, nav card
 * - **dialog** (`surfaceDialogClass`): modal panels (elevated shadow)
 * - **inset** (`surfaceInsetClass`): read-only monospace chips (paths, values)
 * - **control tile** (no token): interactive choices — e.g. basic-info slide cards
 *   (`rounded-lg border-2`), source-picker options (`rounded-lg border` + hover)
 *
 * Prefer {@link Panel} / {@link DialogSurface} over raw tokens when structure repeats.
 */

/** Flat in-app panel (dock sections, viewport frames, nav cards). */
export const surfacePanelClass =
  "rounded-xl border border-border bg-card text-card-foreground shadow-none";

/** Elevated panel (dialogs). */
export const surfaceDialogClass =
  "rounded-xl border border-border bg-card text-card-foreground shadow-2xl";

/** Full-screen modal backdrop. */
export const modalOverlayClass =
  "fixed inset-0 flex items-center justify-center overscroll-contain bg-black/55 px-6 backdrop-blur-sm";

/** AppShell surface (header, body, rails, main, dock). */
export const shellChromeClass = "bg-background";

/** @deprecated Use {@link shellChromeClass}. */
export const shellRailChromeClass = shellChromeClass;

/** Read-only path / monospace value chip. */
export const surfaceInsetClass = "rounded-md border border-border bg-muted/20 text-foreground";
