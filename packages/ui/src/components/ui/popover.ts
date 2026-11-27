import type { Html } from "@effect/ui/html";
import {
  Popover as KitPopover,
  PopoverTrigger as KitPopoverTrigger,
  type PopoverAlign,
  type PopoverDismissReason,
  type PopoverSide,
} from "@effect/ui-kit";

import { cn } from "../../lib/utils";

export { KitPopover as Popover, KitPopoverTrigger as PopoverTrigger };
export type { PopoverAlign, PopoverDismissReason, PopoverSide };

export type Placement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "left-start"
  | "left-end"
  | "right-start"
  | "right-end";

export function parsePlacement(
  placement: Placement = "bottom",
  gutter = 4,
): {
  readonly side: "top" | "bottom" | "left" | "right";
  readonly align: PopoverAlign;
  readonly sideOffset: number;
} {
  const [side, align] = placement.split("-");
  return {
    side: (side ?? "bottom") as "top" | "bottom" | "left" | "right",
    align: (align ?? "center") as PopoverAlign,
    sideOffset: gutter,
  };
}

export const POPOVER_CONTENT_CLASS = "z-popover-content w-72 outline-none";
export const POPOVER_TITLE_CLASS = "z-font-heading z-popover-title";
export const POPOVER_DESCRIPTION_CLASS = "z-popover-description";

export type PopoverHeaderOptions = {
  readonly class?: string | undefined;
};

export function PopoverHeader<M>(h: Html.H<M>, options: PopoverHeaderOptions = {}) {
  return h.div.attr("data-slot", "popover-header").class(cn("z-popover-header", options.class));
}
