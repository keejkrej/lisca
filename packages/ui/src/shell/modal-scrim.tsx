import type { ComponentProps, ReactNode } from "react";

import { modalOverlayClass } from "../lib/surface";
import { cn } from "../lib/utils";

export function ModalScrim({
  children,
  className,
  zIndex = "z-50",
  ...props
}: ComponentProps<"div"> & {
  children: ReactNode;
  zIndex?: "z-40" | "z-50";
}) {
  return (
    <div className={cn(modalOverlayClass, zIndex, className)} {...props}>
      {children}
    </div>
  );
}
