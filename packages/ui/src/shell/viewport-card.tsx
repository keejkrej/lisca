import type { ReactNode } from "react";

import { surfacePanelClass } from "../lib/surface";
import { cn } from "../lib/utils";

/** Padded main-column frame for canvas, plots, and other primary viewport content. */
export function ViewportCard({ children, className }: { children: ReactNode; className?: string }) {
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
