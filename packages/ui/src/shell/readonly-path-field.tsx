import { surfaceInsetClass } from "../lib/surface";
import { cn } from "../lib/utils";

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
      className={cn("min-w-0 truncate px-2 py-1.5 font-mono text-xs", surfaceInsetClass, className)}
      title={value}
    >
      {value}
    </div>
  );
}
