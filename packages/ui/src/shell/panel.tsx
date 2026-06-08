import type { ComponentProps } from "react";

import { cn } from "../lib/utils";

/** Bordered in-app frame (dock, viewport, nav rail). Shell-internal; use Panel/ViewportCard in apps. */
export const panelFrameClass =
  "rounded-xl border border-border bg-background text-foreground shadow-none";

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("relative flex flex-col", panelFrameClass, className)}
      data-slot="panel"
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("shrink-0", className)} data-slot="panel-header" {...props} />;
}

export function PanelTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("font-semibold leading-none", className)}
      data-slot="panel-title"
      {...props}
    />
  );
}

export function PanelDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="panel-description"
      {...props}
    />
  );
}

export function PanelContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-h-0 flex-1", className)} data-slot="panel-content" {...props} />;
}
