import type { KeyboardShortcut } from "@lisca/ui-headless/shortcuts";
import { useEffect } from "react";

export type { KeyboardShortcut, ShortcutModifiers } from "@lisca/ui-headless/shortcuts";

/** Keyboard shortcuts are no-ops on native; hook kept for API parity with web. */
export function useKeyboardShortcuts(
  _shortcuts: readonly KeyboardShortcut[],
  _options?: { enabled?: boolean },
): void {
  useEffect(() => undefined, []);
}
