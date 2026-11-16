import { createFocusRecovery } from "@ui-sdk/core";
import { onCleanup, splitProps, type JSX } from "solid-js";
import { DialogContent } from "../../components/ui/dialog";
import { cn } from "../../lib/utils";

const dialogSurfaceClass =
  "rounded-none border border-border bg-background text-foreground shadow-2xl";

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
    "ref",
  ]);
  // Workflow actions can remove the entire modal instead of requesting a close.
  // Keep that teardown path within UI SDK's focus-recovery behavior as well.
  const opener = typeof document === "undefined" ? null : document.activeElement;
  const recovery = createFocusRecovery({
    fallback: () => (opener instanceof HTMLElement ? opener : null),
  });
  let release: (() => void) | undefined;
  onCleanup(() => release?.());
  return (
    <DialogContent
      ref={(element) => {
        release = recovery.bind(element, { key: "surface", props: {} });
        if (typeof local.ref === "function") local.ref(element);
      }}
      aria-labelledby={local["aria-labelledby"]}
      aria-modal="true"
      data-max-width={local.maxWidth ?? "sm"}
      data-lisca-slot="dialog-surface"
      class={cn(
        "flex w-[calc(100%-3rem)] flex-col",
        maxWidthClass[local.maxWidth ?? "sm"],
        dialogSurfaceClass,
        local.class,
      )}
      role="dialog"
      {...rest}
    >
      {local.children}
    </DialogContent>
  );
}
