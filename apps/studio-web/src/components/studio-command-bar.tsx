import { Button, cn } from "@lisca/ui";
import type { ReactNode } from "react";

export const stepGhostCtaClass =
  "!h-auto !min-h-0 py-1.5 sm:!h-auto sm:py-1.5 !text-xl sm:!text-xl font-normal leading-tight shadow-none";

export function StudioCommandBar({
  instruction,
  tool,
  step,
  className,
}: {
  instruction: string;
  tool: ReactNode;
  step: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[120px] w-full shrink-0 border-t border-border/80 bg-card/40",
        className,
      )}
    >
      <div className="flex w-40 shrink-0 items-center justify-center border-r border-border/80 px-2.5 py-2.5">
        {instruction ? (
          <p className="line-clamp-4 text-center text-lg leading-snug">{instruction}</p>
        ) : null}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center px-2 py-2">
        {tool}
      </div>
      <div className="flex min-w-[9rem] shrink-0 items-center justify-center border-l border-border/80 px-2.5 py-2.5 sm:min-w-[10rem]">
        {step}
      </div>
    </div>
  );
}

export function CommandButton(props: {
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className={stepGhostCtaClass}
      disabled={props.disabled}
      loading={props.loading}
      type="button"
      variant="ghost"
      onClick={props.onClick}
    >
      {props.children}
    </Button>
  );
}
