import { dockToolLabel, type DockToolAction } from "@lisca/ui-headless/dock";
import { useEffect } from "react";

export type { DockToolAction };
export { dockToolLabel };

/** Keyboard shortcuts are no-ops on native; hook kept for API parity with web. */
export function useDockToolShortcuts(
  _actions: readonly DockToolAction[],
  _options?: { enabled?: boolean },
): void {
  useEffect(() => undefined, []);
}
