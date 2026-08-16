import { resolveKeyboardShortcut } from "@lisca/utils";
import { Button } from "@lisca/ui/components";
import {
  PanelSection,
  RailControlStack,
  dockToolLabel,
  dockToolShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";
import { createEffect, For, onCleanup, Show } from "solid-js";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function StudioResultControls(props: {
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
    <>
      <Show when={props.toolActions.length > 0}>
        <PanelSection appearance="rail" title="View">
          <RailControlStack>
            <For each={props.toolActions}>
              {(action, index) => (
                <Button
                  class="w-full justify-center rounded-full"
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
          </RailControlStack>
        </PanelSection>
      </Show>
      <PanelSection appearance="rail" title="Action">
        <RailControlStack>
          <Button
            class="w-full justify-center rounded-full"
            disabled={props.saveDisabled}
            size="sm"
            type="button"
            onClick={props.onSave}
          >
            {props.saveLabel}
          </Button>
        </RailControlStack>
      </PanelSection>
    </>
  );
}
