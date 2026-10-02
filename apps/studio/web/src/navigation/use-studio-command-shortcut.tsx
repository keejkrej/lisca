import { createEffect, onCleanup, Show, type Accessor } from "solid-js";

import { commandModifierHeld } from "./command-modifier-held";
import { studioPageShortcutPlatform } from "./studio-page-shortcuts";
import {
  studioCommandForShortcut,
  studioCommandShortcutHint,
  type StudioCommandShortcut,
} from "./studio-command-shortcuts";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

/**
 * Listens only while the caller is mounted, so Assay Open/New and each page's
 * Save do not fire from the other steps.
 */
export function useStudioCommandShortcut(
  command: StudioCommandShortcut,
  enabled: Accessor<boolean>,
  onTrigger: () => void,
): void {
  const platform = studioPageShortcutPlatform();

  createEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      const match = studioCommandForShortcut(
        {
          key: event.key,
          editableTarget: isEditableTarget(event.target),
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        },
        platform,
      );
      if (match !== command) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat || !enabled()) return;
      onTrigger();
    };

    window.addEventListener("keydown", onKeyDown, true);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown, true));
  });
}

export function commandShortcutKeys(command: StudioCommandShortcut): string {
  return studioCommandShortcutHint(command, studioPageShortcutPlatform()).aria;
}

export function CommandShortcutHint(props: {
  command: StudioCommandShortcut;
  /** `inline` sits in the row after the label. The default overlays the control's right edge. */
  placement?: "corner" | "inline";
}) {
  const hint = studioCommandShortcutHint(props.command, studioPageShortcutPlatform());
  return (
    <Show when={commandModifierHeld()}>
      <kbd
        aria-hidden="true"
        class={
          props.placement === "inline"
            ? "pointer-events-none shrink-0 font-[inherit] text-[10px] font-medium leading-none text-current"
            : "pointer-events-none absolute right-2 font-[inherit] text-[10px] font-medium leading-none text-current"
        }
      >
        {hint.label}
      </kbd>
    </Show>
  );
}
