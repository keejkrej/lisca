import { splitProps } from "solid-js";

import { cn } from "../../lib/utils";
import { Section, type SectionProps } from "./section";

export type SidebarSectionProps = SectionProps;

export function SidebarSection(props: SidebarSectionProps) {
  const [local, sectionProps] = splitProps(props, ["class", "contentClassName", "children"]);
  return (
    <Section
      class={cn("min-h-0 shrink-0", local.class)}
      contentClassName={cn("flex min-h-0 flex-col gap-2 overflow-auto", local.contentClassName)}
      {...sectionProps}
    >
      {local.children}
    </Section>
  );
}