import { useEffect } from "react";

export type DockToolAction = {
  id: string;
  label: string;
  disabled?: boolean;
  active?: boolean;
  onSelect: () => void;
};

export function dockToolLabel(label: string, index: number): string {
  return `${label} (${index + 1})`;
}

/** Keyboard shortcuts are no-ops on native; hook kept for API parity with web. */
export function useDockToolShortcuts(
  _actions: readonly DockToolAction[],
  _options?: { enabled?: boolean },
): void {
  useEffect(() => undefined, []);
}
