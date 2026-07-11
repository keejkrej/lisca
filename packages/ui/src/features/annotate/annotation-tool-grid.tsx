import type { Component } from "solid-js";
import { createEffect, For, onCleanup } from "solid-js";
import { Button } from "@lisca/ui/components";
import {
  ANNOTATION_TOOL_DEFINITIONS,
  ANNOTATION_TOOL_GRID_ROWS,
  annotationToolFamily,
  type AnnotationTool,
  type AnnotationToolFamily,
} from "@lisca/ui-headless/annotation-tools";
import { resolveKeyboardShortcut, type KeyboardShortcut } from "@lisca/ui-headless/shortcuts";
import {
  dockToolLabel,
  dockToolShortcuts,
  type DockToolAction,
} from "@lisca/ui/shell";
import IconLassoRegular from "phosphor-icons-solid/IconLassoRegular";
import IconPaintBrushRegular from "phosphor-icons-solid/IconPaintBrushRegular";
import IconSparkleRegular from "phosphor-icons-solid/IconSparkleRegular";

type PhosphorIcon = Component<{ class?: string }>;

const annotationToolIcons: Record<AnnotationToolFamily, PhosphorIcon> = {
  brush: IconPaintBrushRegular,
  lasso: IconLassoRegular,
  smart: IconSparkleRegular,
};

export function buildAnnotationToolActions(
  tool: AnnotationTool,
  onToolChange: (tool: AnnotationTool) => void,
  disabled: boolean,
  options?: { disableTool?: (tool: AnnotationTool) => boolean },
): DockToolAction[] {
  return ANNOTATION_TOOL_DEFINITIONS.map(({ id, label }) => ({
    id,
    label,
    disabled: disabled || (options?.disableTool?.(id) ?? false),
    active: tool === id,
    onSelect: () => onToolChange(id),
  }));
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function useKeyboardShortcuts(
  shortcuts: () => readonly KeyboardShortcut[],
  options?: () => { enabled?: boolean },
) {
  createEffect(() => {
    const enabled = options?.().enabled ?? true;
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = resolveKeyboardShortcut(shortcuts(), {
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

function AnnotationToolButton(props: { action: DockToolAction; label: string }) {
  const family = annotationToolFamily(props.action.id as AnnotationTool);
  const Icon = annotationToolIcons[family];

  return (
    <Button
      class="w-full min-w-0 justify-center gap-1.5 px-1.5"
      disabled={props.action.disabled}
      size="sm"
      title={props.label}
      type="button"
      variant={props.action.active ? "default" : "outline"}
      onClick={props.action.onSelect}
    >
      <Icon class="size-4 shrink-0" />
      <span class="min-w-0 truncate">{props.label}</span>
    </Button>
  );
}

export function AnnotationToolGrid(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
  class?: string;
  shortcutsEnabled?: boolean;
}) {
  const showShortcutLabels = () => props.shortcutsEnabled ?? true;

  useKeyboardShortcuts(() => dockToolShortcuts(props.toolActions), () => ({
    enabled: props.canEditTools && (props.shortcutsEnabled ?? true),
  }));

  return (
    <div
      aria-label="Annotation tool"
      class={props.class ?? "flex w-full flex-col gap-2"}
      role="toolbar"
    >
      <For each={ANNOTATION_TOOL_GRID_ROWS}>
        {(row) => (
          <div class="grid w-full grid-cols-3 gap-2">
            <For each={row}>
              {(buttonIndex) => {
                const action = () => props.toolActions[buttonIndex];
                const label = () => {
                  const current = action();
                  if (!current) return "";
                  return showShortcutLabels()
                    ? dockToolLabel(current.label, buttonIndex)
                    : current.label;
                };
                return (
                  <div class="min-w-0">
                    {action() ? <AnnotationToolButton action={action()!} label={label()} /> : null}
                  </div>
                );
              }}
            </For>
          </div>
        )}
      </For>
    </div>
  );
}