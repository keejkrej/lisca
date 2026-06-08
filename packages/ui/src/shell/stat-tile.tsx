import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/utils";

export function StatTile({
  label,
  value,
  className,
  ...props
}: {
  label: ReactNode;
  value: ReactNode;
} & Omit<ComponentProps<"div">, "children">) {
  return (
    <div
      className={cn("rounded-md border border-border bg-background px-2 py-2", className)}
      {...props}
    >
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-medium tabular-nums">{value}</div>
    </div>
  );
}
