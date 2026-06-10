import { cn } from "../lib/utils";
import { Section, type SectionProps } from "./section";

export type SidebarSectionProps = SectionProps;

export function SidebarSection({
  className,
  contentClassName,
  children,
  ...sectionProps
}: SidebarSectionProps) {
  return (
    <Section
      className={cn("min-h-0 shrink-0", className)}
      contentClassName={cn("flex min-h-0 flex-col gap-2 overflow-auto", contentClassName)}
      {...sectionProps}
    >
      {children}
    </Section>
  );
}
