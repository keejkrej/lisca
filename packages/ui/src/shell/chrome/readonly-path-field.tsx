const pathChipClass = "rounded-md border border-border bg-muted/20 text-foreground";
import { cn } from "../../lib/utils";

export function ReadonlyPathField({
  value,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      aria-label={ariaLabel ?? `Path ${value}`}
      className={cn(
        "flex h-8 w-full min-w-0 items-center self-stretch truncate px-2 font-mono text-xs",
        pathChipClass,
        className,
      )}
      title={value}
    >
      {value}
    </div>
  );
}
