import type { Html } from "@effect/ui/html";
import type { View } from "@effect/ui";
import { Tooltip as KitTooltip } from "@effect/ui-kit";

import { cn } from "../../lib/utils";
import { TOOLTIP_ARROW_CLASS, TOOLTIP_CONTENT_CLASS } from "./tooltip";

export const COMING_SOON_IN_VERSION = "Coming soon in version 1.0.";

export type ComingSoonTooltipOptions<M, R = never> = {
  readonly key?: string | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => M;
  readonly class?: string | undefined;
  readonly trigger: (
    attach: (
      element: Html.Element<M, R, Html.EventsOf<"button">, HTMLButtonElement, "button">,
    ) => Html.Element<M, R, Html.EventsOf<"button">, HTMLButtonElement, "button">,
  ) => View.Content<M, R>;
};

/**
 * Wraps a disabled (focusable-when-disabled) control so the release note shows
 * on hover or keyboard focus, not beside the label.
 */
export function ComingSoonTooltip<M, R = never>(
  h: Html.H<M>,
  options: ComingSoonTooltipOptions<M, R>,
) {
  return KitTooltip(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      open: options.open,
      delay: 200,
      side: "top",
      align: "center",
      sideOffset: 4,
      describesTrigger: true,
    },
    onEmit: {
      RequestedOpen: () => options.onOpenChange(true),
      RequestedClose: () => options.onOpenChange(false),
    },
    view: (tooltip) =>
      h.span.class(cn("inline-flex min-w-0", options.class)).children(
        options.trigger((el) => tooltip.trigger(el) as typeof el),
        tooltip
          .positioner(h.div)
          .class("z-50")
          .children(
            tooltip
              .popup(h.div)
              .class(
                cn(
                  TOOLTIP_CONTENT_CLASS,
                  "max-w-56 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-4 tracking-normal",
                ),
              )
              .children(COMING_SOON_IN_VERSION, tooltip.arrow(h.div).class(TOOLTIP_ARROW_CLASS)),
          ),
      ),
  });
}
