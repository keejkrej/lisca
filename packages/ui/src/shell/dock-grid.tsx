import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/utils";

export type DockGridLayout = "2x1" | "2x2" | "2x3";

const layoutClassByLayout: Record<DockGridLayout, string> = {
  "2x1": "grid-rows-2 grid-cols-1",
  "2x2": "grid-rows-2 grid-cols-2",
  "2x3": "grid-rows-2 grid-cols-3",
};

const centeredColumnClassByLayout: Record<DockGridLayout, string> = {
  "2x1": "grid-cols-[12rem]",
  "2x2": "grid-cols-[repeat(2,12rem)]",
  "2x3": "grid-cols-[repeat(3,12rem)]",
};

export type DockGridProps = Omit<ComponentProps<"div">, "children"> & {
  layout: DockGridLayout;
  /** Center a compact button grid (studio action sections). */
  centered?: boolean;
  children?: ReactNode;
};

export function DockGrid({ layout, centered = false, className, children, ...props }: DockGridProps) {
  return (
    <div
      className={cn(
        "grid gap-2",
        centered
          ? cn(
              "grid-rows-2 mx-auto w-max justify-items-center place-content-center",
              centeredColumnClassByLayout[layout],
            )
          : layoutClassByLayout[layout],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
