import { HtmlSubscription } from "@effect/ui/html";
import {
  resolveKeyboardShortcut,
  type KeyboardShortcut,
  type ShortcutModifiers,
} from "@lisca/utils";

export type { KeyboardShortcut, ShortcutModifiers };

export type KeyboardShortcutBinding<M> = {
  readonly id?: string | undefined;
  readonly key: string;
  readonly modifiers?: ShortcutModifiers | undefined;
  readonly allowInInput?: boolean | undefined;
  readonly message: M;
};

/**
 * Effect UI Subscription that listens for document `keydown` events via `HtmlSubscription.onDocument`
 * and dispatches the matching shortcut's message while cancelling the browser default.
 */
export function keyboardShortcutsSubscription<M>(
  shortcuts: readonly KeyboardShortcutBinding<M>[],
  options?: { readonly enabled?: boolean | undefined },
) {
  if (options?.enabled === false) {
    return false as const;
  }

  const normalized: readonly (KeyboardShortcut & { readonly message: M })[] = shortcuts.map(
    (entry, index) => ({
      id: entry.id ?? `shortcut-${index}`,
      key: entry.key,
      ...(entry.modifiers !== undefined ? { modifiers: entry.modifiers } : {}),
      ...(entry.allowInInput !== undefined ? { allowInInput: entry.allowInInput } : {}),
      onTrigger: () => {},
      message: entry.message,
    }),
  );

  return HtmlSubscription.onDocument(
    "keydown",
    (event) => {
      const matched = resolveKeyboardShortcut(normalized, {
        key: event.key,
        editableTarget: event.editable,
        metaKey: event.meta,
        ctrlKey: event.ctrl,
        shiftKey: event.shift,
        altKey: event.alt,
      });
      if (!matched) return undefined;
      return (matched as KeyboardShortcut & { readonly message: M }).message;
    },
    { preventDefault: true },
  );
}
