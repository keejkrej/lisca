"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useId, useState } from "react";

import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "./panel";

export type SectionProps = Omit<ComponentProps<typeof Panel>, "title"> & {
  /** Primary heading shown in the section header. */
  title: string;
  description?: string;
  /** Right-aligned slot in the title row (e.g. Reset). */
  headerAction?: ReactNode;
  children?: ReactNode;
  headerClassName?: string;
  contentClassName?: string;
  /** Initial collapsed state for locally managed section disclosure. */
  defaultCollapsed?: boolean;
};

export function Section({
  title,
  description,
  headerAction,
  children,
  className,
  headerClassName,
  contentClassName,
  defaultCollapsed = false,
  ...panelProps
}: SectionProps) {
  const contentId = useId();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const CollapseIcon = collapsed ? ChevronRight : ChevronDown;

  return (
    <Panel className={className} {...panelProps}>
      <PanelHeader className={cn("space-y-1.5 px-3 py-3", !collapsed && "pb-0", headerClassName)}>
        <div className="flex items-start justify-between gap-2">
          <PanelTitle className="min-w-0 flex-1 text-sm">{title}</PanelTitle>
          <div className="flex shrink-0 items-center gap-1">
            {headerAction}
            <Button
              aria-controls={contentId}
              aria-expanded={!collapsed}
              aria-label={collapsed ? `Expand ${title}` : `Collapse ${title}`}
              className="-mr-1 -mt-1"
              size="icon-xs"
              variant="ghost"
              onClick={() => setCollapsed((current) => !current)}
            >
              <CollapseIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
        {description ? (
          <PanelDescription className="text-xs">{description}</PanelDescription>
        ) : null}
      </PanelHeader>
      {!collapsed ? (
        <PanelContent className={cn("space-y-2 px-3 pb-3 pt-2", contentClassName)} id={contentId}>
          {children}
        </PanelContent>
      ) : null}
    </Panel>
  );
}
