import { Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";
import { Icon, type PhosphorIconName } from "@lisca/ui/icons";
import { RailControlStack } from "@lisca/ui/patterns";
import {
  dockToolLabel,
  keyboardShortcutsSubscription,
  type DockToolAction,
  type KeyboardShortcutBinding,
} from "@lisca/ui/shell";
import {
  ANNOTATION_TOOL_DEFINITIONS,
  ANNOTATION_TOOL_GRID_ROWS,
  annotationToolFamily,
  type AnnotationTool,
  type AnnotationToolFamily,
} from "@lisca/utils";
import { Schema, Stream } from "effect";

const AnnotationToolSchema = Schema.Literals([
  "brush",
  "brush-erase",
  "lasso",
  "lasso-erase",
  "smart",
  "smart-erase",
  "magnifier",
]);

const EditToolFamilySchema = Schema.Literals(["brush", "lasso", "smart"]);
type EditToolFamily = typeof EditToolFamilySchema.Type;

const ToolActionItemSchema = Schema.Struct({
  id: AnnotationToolSchema,
  label: Schema.String,
  disabled: Schema.Boolean,
  active: Schema.Boolean,
});

type ToolActionItem = typeof ToolActionItemSchema.Type;

const annotationToolIcons: Record<AnnotationToolFamily, PhosphorIconName> = {
  brush: "paint-brush",
  lasso: "lasso",
  smart: "sparkle",
  magnifier: "magnifying-glass",
};

export function buildAnnotationToolActions(
  tool: AnnotationTool,
  onToolChange: (tool: AnnotationTool) => void,
  disabled: boolean,
  options?: {
    readonly disableTool?: ((tool: AnnotationTool) => boolean) | undefined;
    readonly viewable?: boolean | undefined;
  },
): DockToolAction[] {
  return ANNOTATION_TOOL_DEFINITIONS.map(({ id, label }) => ({
    id,
    label,
    disabled:
      (id === "magnifier" ? options?.viewable === false : disabled) ||
      (options?.disableTool?.(id) ?? false),
    active: tool === id,
    onSelect: () => {
      onToolChange(id);
    },
  }));
}

function activeEditFamilyOf(toolActions: readonly ToolActionItem[]): EditToolFamily | null {
  const activeTool: AnnotationTool = toolActions.find((action) => action.active)?.id ?? "brush";
  const family = annotationToolFamily(activeTool);
  return family === "magnifier" ? null : family;
}

function buildRailActions(
  toolActions: readonly ToolActionItem[],
  lastEditFamily: EditToolFamily,
): readonly ToolActionItem[] {
  const activeTool: AnnotationTool = toolActions.find((action) => action.active)?.id ?? "brush";
  const activeFamily = annotationToolFamily(activeTool);
  const editFamily: EditToolFamily = activeFamily === "magnifier" ? lastEditFamily : activeFamily;
  const primaryIds: readonly AnnotationTool[] = ["brush", "lasso", "smart"];
  const eraseId = `${editFamily}-erase` as AnnotationTool;
  const primary = primaryIds
    .map((id) => toolActions.find((action) => action.id === id))
    .filter((action): action is ToolActionItem => Boolean(action));
  const erase = toolActions.find((action) => action.id === eraseId);
  const magnifier = toolActions.find((action) => action.id === "magnifier");
  const editActions = erase ? [...primary, { ...erase, label: "Erase" }] : primary;
  return magnifier ? [...editActions, magnifier] : editActions;
}

const AnnotationToolGridMessage = UiSchema.TaggedEnum({
  SelectedTool: { tool: AnnotationToolSchema },
  SyncedEditFamily: { family: EditToolFamilySchema },
});

type AnnotationToolGridMsg = typeof AnnotationToolGridMessage.Type;

export const AnnotationToolGridEvents = UiSchema.TaggedEnum({
  SelectedTool: { tool: AnnotationToolSchema },
});

function renderToolButton<M>(
  h: Html.H<M>,
  options: {
    readonly action: ToolActionItem;
    readonly label: string;
    readonly onPress: M;
  },
) {
  const family = annotationToolFamily(options.action.id);
  const iconName = annotationToolIcons[family];

  return Button(h, {
    ariaLabel: options.label,
    class: "w-full min-w-0 justify-center gap-1.5 px-1.5",
    disabled: options.action.disabled,
    size: "sm",
    title: options.label,
    type: "button",
    variant: options.action.active ? "default" : "outline",
    onPress: options.onPress,
  }).children(
    Icon(h, iconName, { class: "size-4 shrink-0" }),
    h.span.class("min-w-0 truncate").children(options.label),
  );
}

const AnnotationToolGridComponent = Html.component({
  name: "LiscaAnnotationToolGrid",
  props: Schema.Struct({
    canEditTools: Schema.Boolean,
    toolActions: Schema.Array(ToolActionItemSchema),
    class: Schema.optional(Schema.String),
    shortcutsEnabled: Schema.Boolean,
    showShortcutLabels: Schema.Boolean,
    layout: Schema.Literals(["grid", "rail"]),
  }),
  model: Schema.Struct({
    lastEditFamily: EditToolFamilySchema,
  }),
  message: AnnotationToolGridMessage,
  events: AnnotationToolGridEvents,
}).make({
  init: ($) => ({
    lastEditFamily: activeEditFamilyOf($.props.toolActions) ?? "brush",
  }),
  update: {
    SelectedTool: ($, { tool }) => {
      const family = annotationToolFamily(tool);
      const nextStep = family !== "magnifier" ? $.evolve({ lastEditFamily: family }) : $;
      return nextStep.emit(AnnotationToolGridEvents.SelectedTool({ tool }));
    },
    SyncedEditFamily: ($, { family }) => $.evolve({ lastEditFamily: family }),
  },
  subscriptions: ({ props, model }) => {
    const activeEditFamily = activeEditFamilyOf(props.toolActions);
    const activeActions =
      props.layout === "rail"
        ? buildRailActions(props.toolActions, activeEditFamily ?? model.lastEditFamily)
        : props.toolActions;

    const shortcutBindings: KeyboardShortcutBinding<AnnotationToolGridMsg>[] = [];
    for (const [index, action] of activeActions.entries()) {
      if (action.disabled) continue;
      shortcutBindings.push({
        id: action.id,
        key: String(index + 1),
        message: AnnotationToolGridMessage.SelectedTool({ tool: action.id }),
      });
    }

    return [
      activeEditFamily !== null &&
        activeEditFamily !== model.lastEditFamily &&
        Subscription.make("annotation-tool-edit-family", activeEditFamily, (family) =>
          Stream.succeed(AnnotationToolGridMessage.SyncedEditFamily({ family })),
        ),
      keyboardShortcutsSubscription(shortcutBindings, {
        enabled: props.shortcutsEnabled,
      }),
    ];
  },
  view: (h, model) => {
    const { props } = h;
    const showShortcutLabels = props.showShortcutLabels;
    const activeEditFamily = activeEditFamilyOf(props.toolActions);
    const resolvedEditFamily = activeEditFamily ?? model.lastEditFamily;

    if (props.layout === "rail") {
      const railActions = buildRailActions(props.toolActions, resolvedEditFamily);
      return RailControlStack(h, { class: props.class })
        .attr("aria-label", "Annotation tool")
        .attr("role", "toolbar")
        .children(
          ...railActions.map((action, index) => {
            const label = showShortcutLabels ? dockToolLabel(action.label, index) : action.label;
            return Button(h, {
              ariaLabel: label,
              class: "h-8 w-full min-w-0 justify-start gap-2 px-3 text-xs",
              disabled: action.disabled,
              size: "sm",
              title: label,
              type: "button",
              variant: action.active ? "default" : "outline",
              onPress: AnnotationToolGridMessage.SelectedTool({ tool: action.id }),
            })
              .key(action.id)
              .children(
                showShortcutLabels
                  ? h.kbd
                      .class(
                        "flex size-4 shrink-0 items-center justify-center rounded-none bg-muted font-[inherit] font-medium text-[10px] text-muted-foreground",
                      )
                      .children(String(index + 1))
                  : undefined,
                h.span.class("min-w-0 flex-1 truncate").children(action.label),
              );
          }),
        );
    }

    const magnifierAction = props.toolActions[6];
    return h.div
      .attr("aria-label", "Annotation tool")
      .attr("role", "toolbar")
      .class(props.class ?? "flex w-full flex-col gap-2")
      .children(
        ...ANNOTATION_TOOL_GRID_ROWS.map((row, rowIndex) =>
          h.div
            .key(`row-${rowIndex}`)
            .class("grid w-full grid-cols-3 gap-2")
            .children(
              ...row.map((buttonIndex) => {
                const action = props.toolActions[buttonIndex];
                const label = action
                  ? showShortcutLabels
                    ? dockToolLabel(action.label, buttonIndex)
                    : action.label
                  : "";
                return h.div
                  .key(action ? action.id : `slot-${buttonIndex}`)
                  .class("min-w-0")
                  .children(
                    action
                      ? renderToolButton(h, {
                          action,
                          label,
                          onPress: AnnotationToolGridMessage.SelectedTool({ tool: action.id }),
                        })
                      : undefined,
                  );
              }),
            ),
        ),
        magnifierAction
          ? h.div
              .key(magnifierAction.id)
              .class("w-full")
              .children(
                renderToolButton(h, {
                  action: magnifierAction,
                  label: showShortcutLabels
                    ? dockToolLabel(magnifierAction.label, 6)
                    : magnifierAction.label,
                  onPress: AnnotationToolGridMessage.SelectedTool({ tool: magnifierAction.id }),
                }),
              )
          : undefined,
      );
  },
});

export type AnnotationToolGridOptions<M = never> = {
  readonly key?: string | undefined;
  readonly canEditTools: boolean;
  readonly toolActions: readonly DockToolAction[];
  readonly onSelectTool?: ((tool: AnnotationTool) => M | undefined) | undefined;
  readonly class?: string | undefined;
  /** When false, digit keys do not change tools. Number badges stay visible unless `showShortcutLabels` is false. */
  readonly shortcutsEnabled?: boolean | undefined;
  readonly showShortcutLabels?: boolean | undefined;
  readonly layout?: "grid" | "rail" | undefined;
};

export type AnnotationToolGridProps<M = never> = AnnotationToolGridOptions<M>;

export function AnnotationToolGrid<M>(h: Html.H<M>, options: AnnotationToolGridOptions<M>) {
  const serializedActions: ToolActionItem[] = options.toolActions.map((action) => ({
    id: action.id as AnnotationTool,
    label: action.label,
    disabled: action.disabled ?? false,
    active: action.active ?? false,
  }));

  return AnnotationToolGridComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      canEditTools: options.canEditTools,
      toolActions: serializedActions,
      ...(options.class !== undefined ? { class: options.class } : {}),
      shortcutsEnabled: options.shortcutsEnabled ?? true,
      showShortcutLabels: options.showShortcutLabels ?? true,
      layout: options.layout ?? "grid",
    },
    onEmit: {
      SelectedTool: ({ tool }) => {
        if (options.onSelectTool) {
          return options.onSelectTool(tool);
        }
        const matched = options.toolActions.find((action) => action.id === tool);
        matched?.onSelect();
        return undefined;
      },
    },
  });
}
