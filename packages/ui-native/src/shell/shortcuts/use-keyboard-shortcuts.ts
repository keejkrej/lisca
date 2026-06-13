import {
  resolveKeyboardShortcut,
  type KeyboardShortcut,
} from "@lisca/ui-headless/shortcuts";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

export type { KeyboardShortcut, ShortcutModifiers } from "@lisca/ui-headless/shortcuts";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function useKeyboardShortcuts(
  shortcuts: readonly KeyboardShortcut[],
  options?: { enabled?: boolean },
): void {
  const enabled = options?.enabled ?? true;
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (Platform.OS !== "web" || !enabled) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = resolveKeyboardShortcut(shortcutsRef.current, {
        key: event.key,
        editableTarget: isEditableTarget(event.target),
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      });
      if (!shortcut) return;

      event.preventDefault();
      shortcut.onTrigger();
    };

    globalThis.window.addEventListener("keydown", onKeyDown);
    return () => globalThis.window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
