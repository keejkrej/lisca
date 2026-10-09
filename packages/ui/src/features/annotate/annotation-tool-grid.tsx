import type { Component } from "solid-js";
import { createEffect, createSignal, For, onCleanup, Show } from "solid-js";
import { Button } from "@lisca/ui/components";
import { ComingSoonTooltip } from "../../components/ui/coming-soon-tooltip";
import {
  ANNOTATION_TOOL_DEFINITIONS,
  ANNOTATION_TOOL_GRID_ROWS,
  annotationToolFamily,
  isSmartAnnotationTool,
  type AnnotationTool,
  type AnnotationToolFamily,
} from "@lisca/utils";
import { resolveKeyboardShortcut, type KeyboardShortcut } from "@lisca/utils";
import { dockToolLabel, dockToolShortcuts, type DockToolAction } from "@lisca/ui/shell";
import { RailControlStack } from "../../shell/regions/rail-control-layout";
import IconLassoRegular from "phosphor-icons-solid/IconLassoRegular";
import IconMagnifyingGlassRegular from "phosphor-icons-solid/IconMagnifyingGlassRegular";
import IconPaintBrushRegular from "phosphor-icons-solid/IconPaintBrushRegular";
import IconSparkleRegular from "phosphor-icons-solid/IconSparkleRegular";

type PhosphorIcon = Component<{ class?: string }>;

const annotationToolIcons: Record<AnnotationToolFamily, PhosphorIcon> = {
  brush: IconPaintBrushRegular,
  lasso: IconLassoRegular,
  smart: IconSparkleRegular,
  magnifier: IconMagnifyingGlassRegular,
};

export function buildAnnotationToolActions(
  tool: AnnotationTool,
  onToolChange: (tool: AnnotationTool) => void,
  disabled: boolean,
  options?: { disableTool?: (tool: AnnotationTool) => boolean; viewable?: boolean },
): DockToolAction[] {
  return ANNOTATION_TOOL_DEFINITIONS.map(({ id, label }) => {
    const deferred = isSmartAnnotationTool(id);
    return {
      id,
      label,
      disabled:
        deferred ||
        (id === "magnifier" ? options?.viewable === false : disabled) ||
        (options?.disableTool?.(id) ?? false),
      active: tool === id,
      onSelect: () => {
        if (deferred) return;
        onToolChange(id);
      },
    };
  });
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
  const deferred = () => isSmartAnnotationTool(props.action.id as AnnotationTool);

  const button = (
    <Button
      aria-label={props.label}
      class="w-full min-w-0 justify-center gap-1.5 px-1.5"
      classList={{ "pointer-events-none": deferred() }}
      disabled={props.action.disabled}
      size="sm"
      title={deferred() ? undefined : props.label}
      type="button"
      variant={props.action.active ? "default" : "outline"}
      onClick={props.action.onSelect}
    >
      <Icon class="size-4 shrink-0" />
      <span class="min-w-0 truncate">{props.label}</span>
    </Button>
  );
  return (
    <Show when={deferred()} fallback={button}>
      <ComingSoonTooltip class="flex w-full">{button}</ComingSoonTooltip>
    </Show>
  );
}

export function AnnotationToolGrid(props: {
  canEditTools: boolean;
  toolActions: DockToolAction[];
  class?: string;
  /** When false, digit keys do not change tools. Number badges stay visible unless `showShortcutLabels` is false. */
  shortcutsEnabled?: boolean;
  showShortcutLabels?: boolean;
  layout?: "grid" | "rail";
}) {
  const showShortcutLabels = () => props.showShortcutLabels ?? true;
  const [lastEditFamily, setLastEditFamily] =
    createSignal<Exclude<AnnotationToolFamily, "magnifier">>("brush");
  createEffect(() => {
    const activeTool = (props.toolActions.find((action) => action.active)?.id ??
      "brush") as AnnotationTool;
    if (isSmartAnnotationTool(activeTool)) {
      props.toolActions.find((action) => action.id === "brush")?.onSelect();
      return;
    }
    const family = annotationToolFamily(activeTool);
    if (family !== "magnifier") setLastEditFamily(family);
  });
  const railActions = () => {
    const activeTool = (props.toolActions.find((action) => action.active)?.id ??
      "brush") as AnnotationTool;
    const activeFamily = annotationToolFamily(activeTool);
    const editFamily = activeFamily === "magnifier" ? lastEditFamily() : activeFamily;
    const primaryIds: AnnotationTool[] = ["brush", "lasso", "smart"];
    const eraseId = `${editFamily}-erase` as AnnotationTool;
    const primary = primaryIds
      .map((id) => props.toolActions.find((action) => action.id === id))
      .filter((action): action is DockToolAction => Boolean(action));
    const erase = props.toolActions.find((action) => action.id === eraseId);
    const magnifier = props.toolActions.find((action) => action.id === "magnifier");
    const editActions = erase ? [...primary, { ...erase, label: "Erase" }] : primary;
    return magnifier ? [...editActions, magnifier] : editActions;
  };

  useKeyboardShortcuts(
    () => dockToolShortcuts(props.layout === "rail" ? railActions() : props.toolActions),
    () => ({
      enabled: props.shortcutsEnabled ?? true,
    }),
  );

  return (
    <Show
      when={props.layout === "rail"}
      fallback={
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
                        {action() ? (
                          <AnnotationToolButton action={action()!} label={label()} />
                        ) : null}
                      </div>
                    );
                  }}
                </For>
              </div>
            )}
          </For>
          {props.toolActions[6] ? (
            <div class="w-full">
              <AnnotationToolButton
                action={props.toolActions[6]!}
                label={
                  showShortcutLabels()
                    ? dockToolLabel(props.toolActions[6]!.label, 6)
                    : props.toolActions[6]!.label
                }
              />
            </div>
          ) : null}
        </div>
      }
    >
      <RailControlStack aria-label="Annotation tool" class={props.class} role="toolbar">
        <For each={railActions()}>
          {(action, index) => {
            const label = () =>
              showShortcutLabels() ? dockToolLabel(action.label, index()) : action.label;
            const deferred = isSmartAnnotationTool(action.id as AnnotationTool);
            const button = (
              <Button
                aria-label={label()}
                class="h-8 w-full min-w-0 justify-start gap-2 px-3 text-xs"
                classList={{ "pointer-events-none": deferred }}
                disabled={action.disabled}
                size="sm"
                title={deferred ? undefined : label()}
                type="button"
                variant={action.active ? "default" : "outline"}
                onClick={action.onSelect}
              >
                {showShortcutLabels() ? (
                  <kbd class="flex size-4 shrink-0 items-center justify-center rounded-none bg-muted font-[inherit] font-medium text-[10px] text-muted-foreground">
                    {index() + 1}
                  </kbd>
                ) : null}
                <span class="min-w-0 flex-1 truncate">{action.label}</span>
              </Button>
            );
            return (
              <Show when={deferred} fallback={button}>
                <ComingSoonTooltip class="flex w-full">{button}</ComingSoonTooltip>
              </Show>
            );
          }}
        </For>
      </RailControlStack>
    </Show>
  );
}
