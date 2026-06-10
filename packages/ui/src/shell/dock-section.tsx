import type { ReactNode } from "react";

import { cn } from "../lib/utils";
import { dockSectionClass } from "./dock-layout";
import { DockGrid, type DockGridLayout, type DockGridProps } from "./dock-grid";
import { Section, type SectionProps } from "./section";

/** Centered flex wrapper shared by every dock section panel. */
export const dockSectionContentClass = "flex min-h-0 items-center justify-center space-y-0";

export type DockSectionProps = Omit<SectionProps, "className" | "contentClassName"> & {
  className?: string;
  contentClassName?: string;
  /** When set, children are wrapped in {@link DockGrid}. */
  layout?: DockGridLayout;
  gridClassName?: string;
  gridProps?: Omit<DockGridProps, "layout" | "className" | "children">;
};

export function DockSection({
  className,
  contentClassName,
  layout,
  gridClassName,
  gridProps,
  children,
  ...sectionProps
}: DockSectionProps) {
  const content =
    layout != null ? (
      <DockGrid className={gridClassName} layout={layout} {...gridProps}>
        {children}
      </DockGrid>
    ) : (
      children
    );

  return (
    <Section
      className={cn(dockSectionClass, className)}
      contentClassName={cn(dockSectionContentClass, contentClassName)}
      {...sectionProps}
    >
      {content}
    </Section>
  );
}
