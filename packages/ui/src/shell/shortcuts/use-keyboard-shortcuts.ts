import { resolveKeyboardShortcut, type KeyboardShortcut } from "@lisca/ui-headless/shortcuts";
import { createEffect, onCleanup } from "solid-js";

export type { KeyboardShortcut, ShortcutModifiers } from "@lisca/ui-headless/shortcuts";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function useKeyboardShortcuts(
  shortcuts: readonly KeyboardShortcut[],
  options?: { enabled?: boolean },
): void {
  const enabled = () => options?.enabled ?? true;

  createEffect(() => {
    if (!enabled()) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = resolveKeyboardShortcut(shortcuts, {
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

    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });
}