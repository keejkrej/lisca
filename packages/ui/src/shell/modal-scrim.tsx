import type { ComponentProps, ReactNode } from "react";

const modalScrimClass =
  "fixed inset-0 flex items-center justify-center overscroll-contain bg-black/55 px-6 backdrop-blur-sm";
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
    <div className={cn(modalScrimClass, zIndex, className)} {...props}>
      {children}
    </div>
  );
}
