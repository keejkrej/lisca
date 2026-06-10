import { cn } from "../lib/utils";
import { Section, type SectionProps } from "./section";
import { sidebarSectionClass, sidebarSectionContentClass } from "./section-placement";

export type SidebarSectionProps = SectionProps;

export function SidebarSection({
  className,
  contentClassName,
  children,
  ...sectionProps
}: SidebarSectionProps) {
  return (
    <Section
      className={cn(sidebarSectionClass, className)}
      contentClassName={cn(sidebarSectionContentClass, contentClassName)}
      {...sectionProps}
    >
      {children}
    </Section>
  );
}
