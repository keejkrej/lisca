import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

export function DockStrip(props: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn("h-full min-h-0 w-full overflow-x-auto", props.className)}>
      <div className="mx-auto flex h-full min-h-full w-fit flex-row items-stretch justify-center gap-3 p-3">
        {props.children}
      </div>
    </div>
  );
}
