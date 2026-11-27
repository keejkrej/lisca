import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import {
  dockToolLabel,
  keyboardShortcutsSubscription,
  type KeyboardShortcutBinding,
} from "@lisca/ui/shell";
import { Schema } from "effect";

const AnalysisShortcutItemSchema = Schema.Struct({
  id: Schema.String,
  disabled: Schema.Boolean,
});

const AnalysisShortcutsMsg = UiSchema.TaggedEnum({
  Triggered: { id: Schema.String },
});

const AnalysisShortcutsEvents = UiSchema.TaggedEnum({
  Triggered: { id: Schema.String },
});

const AnalysisControlsShortcuts = Html.component({
  name: "StudioAnalysisControlsShortcuts",
  props: Schema.Struct({
    enabled: Schema.Boolean,
    items: Schema.Array(AnalysisShortcutItemSchema),
  }),
  model: Schema.Struct({}),
  message: AnalysisShortcutsMsg,
  events: AnalysisShortcutsEvents,
}).make({
  init: () => ({}),
  update: {
    Triggered: ($, { id }) => $.emit(AnalysisShortcutsEvents.Triggered({ id })),
  },
  subscriptions: ({ props }) => {
    const bindings: KeyboardShortcutBinding<typeof AnalysisShortcutsMsg.Type>[] = [];
    for (const [index, item] of props.items.entries()) {
      if (index >= 9 || item.disabled) continue;
      bindings.push({
        id: `analysis-view-${item.id}`,
        key: String(index + 1),
        message: AnalysisShortcutsMsg.Triggered({ id: item.id }),
      });
    }
    return [keyboardShortcutsSubscription(bindings, { enabled: props.enabled })];
  },
  view: () => View.text(""),
});

export type StudioAnalysisToolAction<M> = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean | undefined;
  readonly active?: boolean | undefined;
  readonly onSelect: M;
};

export type StudioAnalysisControlsOptions<M> = {
  readonly key?: string | undefined;
  readonly toolActions: readonly StudioAnalysisToolAction<M>[];
  readonly shortcutsEnabled: boolean;
  readonly saveDisabled: boolean;
  readonly saveLabel: string;
  readonly onSave: M;
};

export function StudioAnalysisControls<M>(h: Html.H<M>, options: StudioAnalysisControlsOptions<M>) {
  const keyPrefix = options.key ? `${options.key}-` : "";

  return [
    AnalysisControlsShortcuts(h, {
      key: `${keyPrefix}shortcuts`,
      props: {
        enabled: options.shortcutsEnabled,
        items: options.toolActions.map((action) => ({
          id: action.id,
          disabled: Boolean(action.disabled),
        })),
      },
      onEmit: {
        Triggered: ({ id }) => options.toolActions.find((action) => action.id === id)?.onSelect,
      },
    }),
    options.toolActions.length > 0
      ? PanelSection(h, {
          key: `${keyPrefix}view`,
          appearance: "rail",
          title: "View",
          children: RailControlStack(h).children(
            ...options.toolActions.map((action, index) =>
              Button(h, {
                class:
                  "h-auto min-h-7 w-full justify-center whitespace-normal py-1 text-center leading-4",
                disabled: action.disabled,
                size: "sm",
                type: "button",
                variant: action.active ? "default" : "outline",
                onPress: action.onSelect,
              })
                .key(action.id)
                .children(dockToolLabel(action.label, index)),
            ),
          ),
        })
      : undefined,
    PanelSection(h, {
      key: `${keyPrefix}action`,
      appearance: "rail",
      title: "Action",
      children: RailControlStack(h).children(
        Button(h, {
          class: "w-full justify-center",
          disabled: options.saveDisabled,
          size: "sm",
          type: "button",
          onPress: options.onSave,
        }).children(options.saveLabel),
      ),
    }),
  ];
}
