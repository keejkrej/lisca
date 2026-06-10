import { cn } from "../lib/utils";
import { Section, type SectionProps } from "./section";
import { dockSectionClass, dockSectionContentClass } from "./section-placement";

export { dockSectionContentClass };

export type DockSectionProps = Omit<SectionProps, "className" | "contentClassName"> & {
  className?: string;
  contentClassName?: string;
};

export function DockSection({
  className,
  contentClassName,
  children,
  ...sectionProps
}: DockSectionProps) {
  return (
    <Section
      className={cn(dockSectionClass, className)}
      contentClassName={cn(dockSectionContentClass, contentClassName)}
      {...sectionProps}
    >
      {children}
    </Section>
  );
}
