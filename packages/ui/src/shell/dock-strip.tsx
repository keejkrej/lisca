import type { ReactNode } from "react";

import { cn } from "../lib/utils";

const dockStripBaseClass =
  "grid h-full min-h-0 w-full items-stretch justify-center gap-3 p-3";

export function DockStrip(props: { panels: 2 | 3; children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        dockStripBaseClass,
        props.panels === 2
          ? "grid-cols-[repeat(2,minmax(0,24rem))]"
          : "mx-auto w-full max-w-5xl grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1.2fr)]",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
