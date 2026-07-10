import { splitProps, type JSX } from "solid-js";

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

export function DialogSurface(
  props: JSX.HTMLAttributes<HTMLDivElement> & {
    children?: JSX.Element;
    maxWidth?: DialogSurfaceMaxWidth;
    "aria-labelledby"?: string;
  },
) {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "maxWidth",
    "aria-labelledby",
  ]);
  return (
    <div
      aria-labelledby={local["aria-labelledby"]}
      aria-modal="true"
      class={cn(
        "flex w-full flex-col",
        maxWidthClass[local.maxWidth ?? "sm"],
        dialogSurfaceClass,
        local.class,
      )}
      role="dialog"
      {...rest}
    >
      {local.children}
    </div>
  );
}