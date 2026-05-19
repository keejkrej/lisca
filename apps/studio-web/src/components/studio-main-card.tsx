import { cn, surfacePanelClass } from "@lisca/ui";
import type { ReactNode } from "react";

export function StudioMainCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex h-full min-h-0 flex-1 flex-col bg-muted/20 p-3", className)}>
      <div
        className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", surfacePanelClass)}
      >
        {children}
      </div>
    </div>
  );
}
