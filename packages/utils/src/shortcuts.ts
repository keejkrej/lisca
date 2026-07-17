export type ShortcutModifiers = {
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export type KeyboardShortcut = {
  id: string;
  key: string;
  modifiers?: ShortcutModifiers;
  /** When false (default), ignored while focus is in an editable field. */
  allowInEditable?: boolean;
  disabled?: boolean;
  onTrigger: () => void;
};

export type KeyboardShortcutContext = {
  key: string;
  editableTarget: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

function modifiersMatch(
  required: ShortcutModifiers | undefined,
  context: KeyboardShortcutContext,
): boolean {
  const expected = required ?? {};
  return (
    context.metaKey === (expected.meta ?? false) &&
    context.ctrlKey === (expected.ctrl ?? false) &&
    context.shiftKey === (expected.shift ?? false) &&
    context.altKey === (expected.alt ?? false)
  );
}

/** Returns the first matching shortcut, or null when none apply. */
export function resolveKeyboardShortcut(
  shortcuts: readonly KeyboardShortcut[],
  context: KeyboardShortcutContext,
): KeyboardShortcut | null {
  for (const shortcut of shortcuts) {
    if (shortcut.disabled) continue;
    if (!shortcut.allowInEditable && context.editableTarget) continue;
    if (shortcut.key !== context.key) continue;
    if (!modifiersMatch(shortcut.modifiers, context)) continue;
    return shortcut;
  }
  return null;
}
