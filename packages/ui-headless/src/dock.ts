import {
  resolveKeyboardShortcut,
  type KeyboardShortcut,
  type KeyboardShortcutContext,
} from "./shortcuts";

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

/** Maps dock tool rows to digit-key shortcuts (1–9, no modifiers). */
export function dockToolShortcuts(actions: readonly DockToolAction[]): KeyboardShortcut[] {
  return actions.map((action, index) => ({
    id: action.id,
    key: String(index + 1),
    disabled: action.disabled,
    onTrigger: action.onSelect,
  }));
}

/** Returns the dock tool action for a keyboard event context, or null when none apply. */
export function resolveDockToolShortcut(
  actions: readonly DockToolAction[],
  context: KeyboardShortcutContext,
): DockToolAction | null {
  const shortcut = resolveKeyboardShortcut(dockToolShortcuts(actions), context);
  if (!shortcut) return null;
  return actions.find((action) => action.id === shortcut.id) ?? null;
}
