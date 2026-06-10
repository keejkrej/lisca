import { Children, Fragment, isValidElement, type ReactNode } from "react";

import { cn } from "../lib/utils";
import { dockSectionClass } from "./dock-layout";
import { DockGrid, type DockGridLayout, type DockGridProps } from "./dock-grid";
import { Section, type SectionProps } from "./section";

/** Centered flex wrapper shared by every dock section panel. */
export const dockSectionContentClass = "flex min-h-0 flex-1 items-center justify-center space-y-0";

/** Compact width for a lone dock button (matches {@link DockButton} `max-w-48`). */
export const dockSingleButtonClass = "mx-auto w-full max-w-48";

function flattenSectionChildren(children: ReactNode): ReactNode[] {
  const flat: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (child == null || typeof child === "boolean") return;
    if (isValidElement(child) && child.type === Fragment) {
      flat.push(...flattenSectionChildren((child.props as { children?: ReactNode }).children));
      return;
    }
    flat.push(child);
  });
  return flat;
}

export type DockSectionProps = Omit<SectionProps, "className" | "contentClassName"> & {
  className?: string;
  contentClassName?: string;
  /** When set, children are wrapped in {@link DockGrid}. */
  layout?: DockGridLayout;
  /** Compact centered grid for action buttons; defaults to true for `2x1`. */
  centered?: boolean;
  gridClassName?: string;
  gridProps?: Omit<DockGridProps, "layout" | "className" | "children" | "centered">;
};

export function DockSection({
  className,
  contentClassName,
  layout,
  centered,
  gridClassName,
  gridProps,
  children,
  ...sectionProps
}: DockSectionProps) {
  const gridCentered = centered ?? layout === "2x1";
  const flatChildren = flattenSectionChildren(children);
  const singleCenteredButton =
    layout === "2x1" && gridCentered && flatChildren.length === 1;
  const content = singleCenteredButton ? (
    <div className={dockSingleButtonClass}>{flatChildren[0]}</div>
  ) : layout != null ? (
    <DockGrid centered={gridCentered} className={gridClassName} layout={layout} {...gridProps}>
      {flatChildren}
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
