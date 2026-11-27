import { UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";

import { Button } from "../../components/ui/button";
import { Icon } from "../../icons";
import { cn } from "../../lib/utils";
import { ShellLayoutProvider, ShellLayoutReceives } from "./shell-layout-context";

const ShellPanelToggleMessage = UiSchema.TaggedEnum({
  Clicked: {},
});

export const ShellPanelToggle = Html.component({
  name: "ShellPanelToggle",
  props: Schema.Struct({
    side: Schema.Literals(["left", "right"]),
    class: Schema.optional(Schema.String),
  }),
  model: Schema.Struct({}),
  message: ShellPanelToggleMessage,
  reads: {
    layout: ShellLayoutProvider,
  },
}).make({
  init: () => ({}),
  update: {
    Clicked: ($) =>
      $.send(
        ShellLayoutProvider,
        $.props.side === "left"
          ? ShellLayoutReceives.ToggleLeft()
          : ShellLayoutReceives.ToggleRight(),
      ),
  },
  view: (h) => {
    const layout = h.reads.layout;
    const isLeft = h.props.side === "left";
    const open = isLeft ? layout.leftOpen : layout.rightOpen;
    const hasPanels = isLeft ? layout.hasLeftPanels : layout.hasRightPanels;

    if (!layout.isPortrait || !hasPanels) {
      return View.text("");
    }

    const label = isLeft
      ? open
        ? "Close left panel"
        : "Open left panel"
      : open
        ? "Close right panel"
        : "Open right panel";

    const iconName = isLeft
      ? open
        ? "caret-left"
        : "caret-right"
      : open
        ? "caret-right"
        : "caret-left";

    return Button(h, {
      ariaLabel: label,
      class: cn("pointer-events-auto shadow-sm", h.props.class),
      size: "icon-sm",
      type: "button",
      variant: "outline",
      onPress: ShellPanelToggleMessage.Clicked(),
    })
      .attr("aria-expanded", open ? "true" : "false")
      .children(Icon(h, iconName, { class: "size-4" }));
  },
});

export const ShellPortraitPanelControls = Html.component({
  name: "ShellPortraitPanelControls",
  props: Schema.Struct({
    placement: Schema.optional(Schema.Literals(["center", "top"])),
  }),
  model: Schema.Struct({}),
  message: Schema.Never,
  reads: {
    layout: ShellLayoutProvider,
  },
}).make({
  init: () => ({}),
  update: ($) => $.model,
  view: (h) => {
    const layout = h.reads.layout;
    if (!layout.isPortrait) {
      return View.text("");
    }

    const placementClass = h.props.placement === "top" ? "top-4" : "top-1/2 -translate-y-1/2";

    return h.div.class("contents").children(
      layout.hasLeftPanels
        ? h.div
            .key("left-toggle")
            .class(cn("pointer-events-none absolute left-3 z-30", placementClass))
            .children(ShellPanelToggle(h, { key: "left", props: { side: "left" } }))
        : undefined,
      layout.hasRightPanels
        ? h.div
            .key("right-toggle")
            .class(cn("pointer-events-none absolute right-3 z-30", placementClass))
            .children(ShellPanelToggle(h, { key: "right", props: { side: "right" } }))
        : undefined,
    );
  },
});
