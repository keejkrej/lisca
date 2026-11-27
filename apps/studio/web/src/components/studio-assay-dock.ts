import { UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { PanelSection, RailControlStack } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";
import { Schema } from "effect";

import {
  CommandShortcutHint,
  commandShortcutKeys,
  studioCommandShortcutSubscription,
} from "../navigation/use-studio-command-shortcut";

const AssayActionsMsg = UiSchema.TaggedEnum({
  OpenClicked: {},
  NewClicked: {},
});

const AssayActionsEvents = UiSchema.TaggedEnum({
  OpenAssay: {},
  NewAssay: {},
});

const StudioAssayActionsComponent = Html.component({
  name: "StudioAssayActions",
  props: Schema.Struct({
    openingAssay: Schema.Boolean,
    assayPickerOpen: Schema.Boolean,
  }),
  model: Schema.Struct({}),
  message: AssayActionsMsg,
  events: AssayActionsEvents,
}).make({
  init: () => ({}),
  update: {
    OpenClicked: ($) => $.emit(AssayActionsEvents.OpenAssay()),
    NewClicked: ($) => $.emit(AssayActionsEvents.NewAssay()),
  },
  subscriptions: ({ props }) => [
    studioCommandShortcutSubscription(
      "open",
      !props.openingAssay && !props.assayPickerOpen,
      AssayActionsMsg.OpenClicked(),
    ),
    studioCommandShortcutSubscription("new", !props.openingAssay, AssayActionsMsg.NewClicked()),
  ],
  view: (h) =>
    PanelSection(h, {
      key: "assay-actions-section",
      appearance: "rail",
      title: "Action",
      children: RailControlStack(h).children(
        Button(h, {
          class: "relative w-full justify-center",
          disabled: h.props.openingAssay || h.props.assayPickerOpen,
          size: "sm",
          type: "button",
          variant: "outline",
          onPress: AssayActionsMsg.OpenClicked(),
        })
          .attr("aria-keyshortcuts", commandShortcutKeys("open"))
          .children("Open", CommandShortcutHint(h, { key: "open-hint", command: "open" })),
        Button(h, {
          class: "relative w-full justify-center",
          disabled: h.props.openingAssay,
          size: "sm",
          type: "button",
          onPress: AssayActionsMsg.NewClicked(),
        })
          .attr("aria-keyshortcuts", commandShortcutKeys("new"))
          .children("New", CommandShortcutHint(h, { key: "new-hint", command: "new" })),
      ),
    }),
});

export type StudioAssayActionsOptions<M> = {
  readonly key?: string | undefined;
  readonly openingAssay: boolean;
  readonly assayPickerOpen: boolean;
  readonly onNewAssay: M;
  readonly onOpenAssay: M;
};

export function StudioAssayActions<M>(h: Html.H<M>, options: StudioAssayActionsOptions<M>) {
  return StudioAssayActionsComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      openingAssay: options.openingAssay,
      assayPickerOpen: options.assayPickerOpen,
    },
    onEmit: {
      NewAssay: () => options.onNewAssay,
      OpenAssay: () => options.onOpenAssay,
    },
  });
}
