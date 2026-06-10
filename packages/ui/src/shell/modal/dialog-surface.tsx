import type { ComponentProps, ReactNode } from "react";

const dialogSurfaceClass =
  "rounded-xl border border-border bg-background text-foreground shadow-2xl";
import { cn } from "../../lib/utils";

const maxWidthClass = {
  sm: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
} as const;

export type DialogSurfaceMaxWidth = keyof typeof maxWidthClass;

export function DialogSurface({
  children,
  className,
  maxWidth = "sm",
  "aria-labelledby": ariaLabelledBy,
  ...props
}: ComponentProps<"div"> & {
  children: ReactNode;
  maxWidth?: DialogSurfaceMaxWidth;
  "aria-labelledby"?: string;
}) {
  return (
    <div
      aria-labelledby={ariaLabelledBy}
      aria-modal="true"
      className={cn("flex w-full flex-col", maxWidthClass[maxWidth], dialogSurfaceClass, className)}
      role="dialog"
      {...props}
    >
      {children}
    </div>
  );
}
