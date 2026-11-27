import type { Html } from "@effect/ui/html";

import { cn } from "../../lib/utils";
import { Section, type SectionOptions } from "./section";

export type DockSectionFit = "hug" | "panel";

export type DockSectionOptions<M, R = never> = Omit<SectionOptions<M, R>, "chevron"> & {
  /** `hug` (default) shrinks to content; `panel` uses a stable instruction band. */
  readonly fit?: DockSectionFit | undefined;
};

export type DockSectionProps<M = never, R = never> = DockSectionOptions<M, R>;

export function DockSection<M, R = never>(h: Html.H<M>, options: DockSectionOptions<M, R>) {
  return Section(h, {
    ...options,
    chevron: "horizontal",
    class: cn(
      "flex h-full min-h-0 shrink-0 flex-col data-[collapsed]:min-w-0 data-[collapsed]:w-auto",
      (options.fit ?? "hug") === "panel" ? "min-w-56 max-w-xs" : "w-max max-w-full",
      options.class,
    ),
    contentClassName: cn(
      "flex min-h-0 flex-1 flex-col justify-center gap-2",
      options.contentClassName,
    ),
  });
}
