import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/utils";

export type DockGridLayout = "2x1" | "2x2" | "2x3";

const layoutClassByLayout: Record<DockGridLayout, string> = {
  "2x1": "grid-rows-2 grid-cols-1",
  "2x2": "grid-rows-2 grid-cols-2",
  "2x3": "grid-rows-2 grid-cols-3",
};

export type DockGridProps = Omit<ComponentProps<"div">, "children"> & {
  layout: DockGridLayout;
  children?: ReactNode;
};

export function DockGrid({ layout, className, children, ...props }: DockGridProps) {
  return (
    <div className={cn("grid w-full gap-2", layoutClassByLayout[layout], className)} {...props}>
      {children}
    </div>
  );
}
