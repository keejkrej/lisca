import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StudioCommandBarProps = {
  /** Short helper for the current step (left, fixed width). */
  instruction: string;
  /** Center slot: empty in Figma. */
  tool: ReactNode;
  /** Right slot: single forward action. */
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
      <div className="flex w-40 shrink-0 items-center justify-center border-r border-border/80 px-2.5 py-2.5">
        {instruction ? (
          <p className="text-foreground line-clamp-4 text-center text-2xl leading-tight">
            {instruction}
          </p>
        ) : null}
      </div>
      <div className="min-h-0 min-w-0 flex-1 px-0 py-2">{tool}</div>
      <div className="flex w-40 shrink-0 items-center justify-center border-l border-border/80 px-2.5 py-2.5">
        {step}
      </div>
    </div>
  );
}
