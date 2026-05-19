/** Flat in-app panel (dock sections, viewport frames, nav cards). */
export const surfacePanelClass =
  "rounded-xl border border-border bg-card text-card-foreground shadow-none before:hidden";

/** Elevated panel (dialogs). */
export const surfaceDialogClass =
  "rounded-xl border border-border bg-card text-card-foreground shadow-2xl before:hidden";

/** Full-screen modal backdrop. */
export const modalOverlayClass =
  "fixed inset-0 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm";

/** Left/right shell sidebar tint (behind panel cards). */
export const shellRailChromeClass = "bg-card/32";

/** Read-only path / monospace value chip. */
export const surfaceInsetClass = "rounded-md border border-border bg-muted/20 text-foreground";
