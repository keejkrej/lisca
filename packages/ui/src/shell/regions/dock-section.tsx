import { splitProps } from "solid-js";

import { cn } from "../../lib/utils";
import { Section, type SectionProps } from "./section";

export type DockSectionFit = "hug" | "panel";

export type DockSectionProps = Omit<SectionProps, "class" | "contentClassName" | "chevron"> & {
  class?: string;
  contentClassName?: string;
  /** `hug` (default) shrinks to content; `panel` uses a stable instruction band. */
  fit?: DockSectionFit;
};

export function DockSection(props: DockSectionProps) {
  const [local, sectionProps] = splitProps(props, [
    "class",
    "contentClassName",
    "children",
    "fit",
  ]);
  return (
    <Section
      chevron="horizontal"
      class={cn(
        "flex h-full min-h-0 shrink-0 flex-col data-[collapsed]:min-w-0 data-[collapsed]:w-auto",
        (local.fit ?? "hug") === "panel" ? "min-w-56 max-w-xs" : "w-max max-w-full",
        local.class,
      )}
      contentClassName={cn(
        "flex min-h-0 flex-1 flex-col justify-center gap-2",
        local.contentClassName,
      )}
      {...sectionProps}
    >
      {local.children}
    </Section>
  );
}
