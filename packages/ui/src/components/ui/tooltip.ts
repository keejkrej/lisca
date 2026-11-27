import {
  Tooltip as KitTooltip,
  TooltipProvider as KitTooltipProvider,
  type TooltipAlign,
  type TooltipSide,
} from "@effect/ui-kit";

import { parsePlacement, type Placement } from "./popover";

export { KitTooltip as Tooltip, KitTooltipProvider as TooltipProvider, parsePlacement };
export type { Placement, TooltipAlign, TooltipSide };

export const TOOLTIP_CONTENT_CLASS =
  "z-50 z-tooltip-content w-fit max-w-xs origin-(--transform-origin) bg-foreground text-background";
export const TOOLTIP_ARROW_CLASS = "z-tooltip-arrow size-2.5 rotate-45 bg-foreground";
