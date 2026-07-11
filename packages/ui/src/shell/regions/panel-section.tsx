import { splitProps } from "solid-js";

import { cn } from "../../lib/utils";
import { Section, type SectionProps } from "./section";

export type PanelSectionProps = SectionProps;

/** Sidebar placement: full width, height hugs content (inverse of `DockSection`). */
export function PanelSection(props: PanelSectionProps) {
  const [local, sectionProps] = splitProps(props, ["class", "contentClassName", "children"]);
  return (
    <Section
      class={cn("w-full shrink-0", local.class)}
      contentClassName={cn("flex flex-col gap-2", local.contentClassName)}
      {...sectionProps}
    >
      {local.children}
    </Section>
  );
}
