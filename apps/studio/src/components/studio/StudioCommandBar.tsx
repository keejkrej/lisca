import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StudioCommandBarProps = {
  /** Short helper for the current step (left, fixed width). */
  instruction: string;
  /** Center slot: Back only (optional). */
  tool: ReactNode;
  /** Right slot: single primary forward action (e.g. Next / Submit). */
  step: ReactNode;
  className?: string;
};

export function StudioCommandBar({ instruction, tool, step, className }: StudioCommandBarProps) {
  return (
    <div
      className={cn(
        "flex h-[120px] w-full shrink-0 border-t border-border/80 bg-card/40",
        className,
      )}
    >
      <div className="flex w-40 shrink-0 flex-col justify-center border-r border-border/80 px-3 py-2">
        <p className="text-muted-foreground line-clamp-4 text-xs leading-snug">{instruction}</p>
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-4 py-2">{tool}</div>
      <div className="flex w-40 shrink-0 flex-col items-end justify-center border-l border-border/80 px-3 py-2">
        {step}
      </div>
    </div>
  );
}
