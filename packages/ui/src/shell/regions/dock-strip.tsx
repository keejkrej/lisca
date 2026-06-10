import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export function DockStrip(props: { children?: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full items-stretch justify-center gap-3 p-3",
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}
