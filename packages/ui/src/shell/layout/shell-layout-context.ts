import { Subscription, UiSchema } from "@effect/ui";
import { Html } from "@effect/ui/html";
import {
  initialShellLayoutPanelState,
  isStageOverlayViewport,
  shellLayoutReducer,
  STAGE_SHELL_INLINE_MIN_WIDTH,
} from "@lisca/ui-headless/shell-layout";
import { Effect, Queue, Schema, Stream } from "effect";

export const ShellLayoutSharedSchema = Schema.Struct({
  isPortrait: Schema.Boolean,
  leftOpen: Schema.Boolean,
  rightOpen: Schema.Boolean,
  hasLeftPanels: Schema.Boolean,
  hasRightPanels: Schema.Boolean,
});

export type ShellLayoutShared = typeof ShellLayoutSharedSchema.Type;

export const ShellLayoutReceives = UiSchema.TaggedEnum({
  ToggleLeft: {},
  ToggleRight: {},
  ClosePanels: {},
  SetPanelAvailability: {
    hasLeftPanels: Schema.Boolean,
    hasRightPanels: Schema.Boolean,
  },
});

export type ShellLayoutReceives = typeof ShellLayoutReceives.Type;

const ShellLayoutMessage = UiSchema.TaggedEnum({
  ToggleLeft: {},
  ToggleRight: {},
  ClosePanels: {},
  SetPanelAvailability: {
    hasLeftPanels: Schema.Boolean,
    hasRightPanels: Schema.Boolean,
  },
  ViewportChanged: {
    isPortrait: Schema.Boolean,
  },
});

function overlayViewportFromWindow(): boolean {
  if (typeof window === "undefined") return false;
  return isStageOverlayViewport(window.innerWidth, window.innerHeight);
}

const watchOverlayViewport = Stream.callback<typeof ShellLayoutMessage.Type>((queue) => {
  if (typeof window === "undefined") {
    return Effect.void;
  }

  const update = () => {
    Queue.offerUnsafe(
      queue,
      ShellLayoutMessage.ViewportChanged({ isPortrait: overlayViewportFromWindow() }),
    );
  };

  const media =
    typeof window.matchMedia === "function"
      ? [
          window.matchMedia("(max-aspect-ratio: 1/1)"),
          window.matchMedia(`(max-width: ${STAGE_SHELL_INLINE_MIN_WIDTH - 1}px)`),
        ]
      : [];

  update();
  for (const query of media) {
    query.addEventListener("change", update);
  }
  window.addEventListener("resize", update);

  return Effect.addFinalizer(() =>
    Effect.sync(() => {
      for (const query of media) {
        query.removeEventListener("change", update);
      }
      window.removeEventListener("resize", update);
    }),
  );
});

export const ShellLayoutProvider = Html.component({
  name: "ShellLayoutProvider",
  props: Schema.Struct({
    hasLeftPanels: Schema.optional(Schema.Boolean),
    hasRightPanels: Schema.optional(Schema.Boolean),
  }),
  model: ShellLayoutSharedSchema,
  message: ShellLayoutMessage,
  shares: {
    value: ({ model, props }) => ({
      isPortrait: model.isPortrait,
      leftOpen: model.leftOpen,
      rightOpen: model.rightOpen,
      hasLeftPanels: props.hasLeftPanels ?? model.hasLeftPanels,
      hasRightPanels: props.hasRightPanels ?? model.hasRightPanels,
    }),
    schema: ShellLayoutSharedSchema,
    receives: ["ToggleLeft", "ToggleRight", "ClosePanels", "SetPanelAvailability"],
  },
}).make({
  init: ($) =>
    $.set({
      isPortrait: overlayViewportFromWindow(),
      leftOpen: initialShellLayoutPanelState.leftOpen,
      rightOpen: initialShellLayoutPanelState.rightOpen,
      hasLeftPanels: $.props.hasLeftPanels ?? false,
      hasRightPanels: $.props.hasRightPanels ?? false,
    }),
  update: {
    ToggleLeft: ($) => {
      const next = shellLayoutReducer(
        { leftOpen: $.model.leftOpen, rightOpen: $.model.rightOpen },
        { type: "toggle-left" },
      );
      return $.evolve({ leftOpen: next.leftOpen, rightOpen: next.rightOpen });
    },
    ToggleRight: ($) => {
      const next = shellLayoutReducer(
        { leftOpen: $.model.leftOpen, rightOpen: $.model.rightOpen },
        { type: "toggle-right" },
      );
      return $.evolve({ leftOpen: next.leftOpen, rightOpen: next.rightOpen });
    },
    ClosePanels: ($) => {
      const next = shellLayoutReducer(
        { leftOpen: $.model.leftOpen, rightOpen: $.model.rightOpen },
        { type: "close" },
      );
      return $.evolve({ leftOpen: next.leftOpen, rightOpen: next.rightOpen });
    },
    SetPanelAvailability: ($, { hasLeftPanels, hasRightPanels }) =>
      $.evolve({ hasLeftPanels, hasRightPanels }),
    ViewportChanged: ($, { isPortrait }) => {
      if (isPortrait === $.model.isPortrait) {
        return $.model;
      }
      const next = shellLayoutReducer(
        { leftOpen: $.model.leftOpen, rightOpen: $.model.rightOpen },
        { type: "portrait-changed", isPortrait },
      );
      return $.evolve({
        isPortrait,
        leftOpen: next.leftOpen,
        rightOpen: next.rightOpen,
      });
    },
  },
  subscriptions: () => [Subscription.make("shell-layout-viewport", watchOverlayViewport)],
  parts: (p, model) => ({
    isPortrait: model.isPortrait,
    leftOpen: model.leftOpen,
    rightOpen: model.rightOpen,
    hasLeftPanels: p.props.hasLeftPanels ?? model.hasLeftPanels,
    hasRightPanels: p.props.hasRightPanels ?? model.hasRightPanels,
    closeOverlayButton: p.part("button", (b) => b.on("click", ShellLayoutMessage.ClosePanels())),
  }),
});
