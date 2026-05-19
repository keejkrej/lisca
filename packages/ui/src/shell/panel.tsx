import type { ComponentProps } from "react";

import { surfacePanelClass } from "../lib/surface";
import { cn } from "../lib/utils";

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("relative flex flex-col", surfacePanelClass, className)}
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
