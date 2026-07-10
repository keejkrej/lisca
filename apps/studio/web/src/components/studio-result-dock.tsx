import { resolveKeyboardShortcut } from "@lisca/ui-headless/shortcuts";
import { Button } from "@lisca/ui/components";
import {
  DockSection,
  DockStrip,
  dockToolLabel,
  dockToolShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";
import { createEffect, For, onCleanup } from "solid-js";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function StudioResultDock(props: {
  instruction: string;
  toolActions: DockToolAction[];
  shortcutsEnabled: boolean;
  saveDisabled: boolean;
  saveLabel: string;
  onSave: () => void;
}) {
  createEffect(() => {
    if (!props.shortcutsEnabled) return;
    const shortcuts = dockToolShortcuts(props.toolActions);
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

  return (
    <DockStrip>
      <DockSection fit="panel" title="Instruction">
        <p class="line-clamp-4 text-center text-sm leading-snug">{props.instruction}</p>
      </DockSection>
      <DockSection title="Tool">
        <div class="flex flex-col gap-2">
          <For each={props.toolActions}>
            {(action, index) => (
              <Button
                class="w-full justify-center"
                disabled={action.disabled}
                size="sm"
                type="button"
                variant={action.active ? "default" : "outline"}
                onClick={action.onSelect}
              >
                {dockToolLabel(action.label, index())}
              </Button>
            )}
          </For>
        </div>
      </DockSection>
      <DockSection title="Action">
        <div class="flex flex-col gap-2">
          <Button
            class="w-full justify-center"
            disabled={props.saveDisabled}
            size="sm"
            type="button"
            variant="outline"
            onClick={props.onSave}
          >
            {props.saveLabel}
          </Button>
        </div>
      </DockSection>
    </DockStrip>
  );
}