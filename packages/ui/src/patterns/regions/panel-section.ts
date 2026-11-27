import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";
import { Section, type SectionOptions } from "./section";

export type PanelSectionOptions<M, R = never> = Omit<SectionOptions<M, R>, "chevron">;
export type PanelSectionProps<M = never, R = never> = PanelSectionOptions<M, R>;

/** Sidebar placement: full width, height hugs content (inverse of `DockSection`). */
export function PanelSection<M, R = never>(h: Html.H<M>, options: PanelSectionOptions<M, R>) {
  return Section(h, {
    ...options,
    chevron: "vertical",
    class: cn("w-full shrink-0", options.class),
    contentClassName: cn("flex flex-col gap-2", options.contentClassName),
  });
}
