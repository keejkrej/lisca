import { Command, Component, UiSchema, type View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Tooltip as KitTooltip } from "@effect/ui-kit";
import { Effect, Schema } from "effect";

import { Button } from "../../components/ui/button";
import { TOOLTIP_ARROW_CLASS, TOOLTIP_CONTENT_CLASS } from "../../components/ui/tooltip";
import { Icon } from "../../icons";

const StagePathMessage = UiSchema.TaggedEnum({
  SetTooltipOpen: { open: Schema.Boolean },
  ClickedTrigger: {},
  RequestedCopy: {},
  CopiedPath: {},
  ResetCopied: {},
});

const StagePathEvents = UiSchema.TaggedEnum({
  Pressed: {},
});

const CopyPathCommand = Command.make(
  "LiscaCopyStagePath",
  { args: { value: Schema.String } },
  ({ value }) =>
    Effect.tryPromise({
      try: async () => {
        await navigator.clipboard?.writeText(value);
      },
      catch: () => undefined,
    }).pipe(
      Effect.as(StagePathMessage.CopiedPath()),
      Effect.catch(() => Effect.succeed(Component.noop)),
    ),
);

const ResetCopiedCommand = Command.make("LiscaResetStagePathCopied", { args: {} }, () =>
  Effect.sleep("1200 millis").pipe(Effect.as(StagePathMessage.ResetCopied())),
);

const StagePathButtonComponent = Html.component({
  name: "LiscaStagePathButton",
  props: Schema.Struct({
    label: Schema.String,
    value: Schema.NullOr(Schema.String),
    disabled: Schema.Boolean,
  }),
  model: Schema.Struct({
    tooltipOpen: Schema.Boolean,
    copied: Schema.Boolean,
  }),
  message: StagePathMessage,
  events: StagePathEvents,
}).make({
  init: () => ({ tooltipOpen: false, copied: false }),
  update: {
    SetTooltipOpen: ($, { open }) => $.evolve({ tooltipOpen: open }),
    ClickedTrigger: ($) => ($.props.disabled ? $.model : $.emit(StagePathEvents.Pressed())),
    RequestedCopy: ($) => {
      if (!$.props.value) return $.model;
      return $.run(CopyPathCommand.make({ value: $.props.value }));
    },
    CopiedPath: ($) => $.evolve({ copied: true }).run(ResetCopiedCommand.make()),
    ResetCopied: ($) => $.evolve({ copied: false }),
  },
  view: (h, model) =>
    KitTooltip(h, {
      props: {
        open: model.tooltipOpen,
        side: "bottom",
        align: "center",
        sideOffset: 2,
        delay: 100,
        closeDelay: 400,
      },
      onEmit: {
        RequestedOpen: () => StagePathMessage.SetTooltipOpen({ open: true }),
        RequestedClose: () => StagePathMessage.SetTooltipOpen({ open: false }),
      },
      view: (tooltip) =>
        h.span.class("inline-flex").children(
          Button(h, {
            element: tooltip.trigger(h.button),
            variant: "outline",
            size: "sm",
            disabled: h.props.disabled,
            ariaLabel: h.props.value
              ? `${h.props.label}: ${h.props.value}`
              : `${h.props.label}: not set`,
            class: "px-2.5 font-normal",
            onPress: StagePathMessage.ClickedTrigger(),
          })
            .on(
              "contextmenu",
              () => (h.props.value ? StagePathMessage.RequestedCopy() : undefined),
              { preventDefault: true },
            )
            .children(
              h.span
                .class(
                  "shrink-0 text-[10px] font-normal uppercase tracking-[0.12em] text-foreground",
                )
                .children(h.props.label),
            ),
          tooltip.open
            ? tooltip
                .positioner(h.div)
                .class("z-50")
                .children(
                  tooltip
                    .popup(h.div)
                    .class(`${TOOLTIP_CONTENT_CLASS} max-w-[min(90vw,32rem)]`)
                    .children(
                      h.div.class("flex items-center gap-2").children(
                        h.props.value
                          ? [
                              h.code
                                .class("min-w-0 flex-1 truncate text-left font-mono text-[11px]")
                                .children(model.copied ? "Copied" : h.props.value),
                              h.button
                                .attr("type", "button")
                                .attr("aria-label", model.copied ? "Copied" : "Copy path")
                                .class(
                                  "shrink-0 rounded p-1 text-background/70 transition-colors hover:bg-background/15 hover:text-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-background/60",
                                )
                                .on("click", StagePathMessage.RequestedCopy())
                                .children(Icon(h, "copy", { class: "size-3.5" })),
                            ]
                          : h.span.children(`Pick a ${h.props.label.toLowerCase()} folder`),
                      ),
                      tooltip.arrow(h.div).class(TOOLTIP_ARROW_CLASS),
                    ),
                )
            : undefined,
        ),
    }),
});

export type PathButtonOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly label: string;
  readonly value: string | null;
  readonly icon?: View.Content<M, R> | undefined;
  readonly appearance?: "default" | "stage" | undefined;
  readonly preserveExtension?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  readonly onPress?: M | undefined;
};

/** Basename path control (`Button` outline; matches shell chrome). */
export function PathButton<M, R = never>(h: Html.H<M>, options: PathButtonOptions<M, R>) {
  const disabled = options.disabled ?? options.onPress === undefined;

  if (options.appearance === "stage") {
    return StagePathButtonComponent(h, {
      ...(options.key !== undefined ? { key: options.key } : {}),
      props: {
        label: options.label,
        value: options.value,
        disabled,
      },
      onEmit: {
        Pressed: () => options.onPress,
      },
    });
  }

  const basename = options.value?.split(/[\\/]/).findLast((part) => part.length > 0);
  const display = !basename
    ? null
    : options.preserveExtension
      ? basename
      : basename.replace(/\.[^./\\]+$/, "");

  return Button(h, {
    variant: "outline",
    size: "sm",
    disabled,
    title: options.value ? options.value : options.label,
    onPress: disabled ? undefined : options.onPress,
    class: "max-w-[min(100%,18rem)] justify-start gap-2 font-normal",
  }).children(
    h.span.class("shrink-0").children(options.icon),
    h.span.class("min-w-0 truncate").children(display ?? options.label),
  );
}
