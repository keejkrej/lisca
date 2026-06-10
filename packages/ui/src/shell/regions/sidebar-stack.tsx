import type { ComponentProps, ReactNode } from "react";

import { cn } from "../../lib/utils";

export type SidebarStackProps = Omit<ComponentProps<"div">, "children"> & {
  children?: ReactNode;
};

export function SidebarStack({ className, children, ...props }: SidebarStackProps) {
  return (
    <div className={cn("flex min-h-0 flex-col gap-2 overflow-auto p-3", className)} {...props}>
      {children}
    </div>
  );
}
