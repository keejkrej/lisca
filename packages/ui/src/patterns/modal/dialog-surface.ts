import type { Html } from "@effect/ui/html";

import { DIALOG_CONTENT_CLASS } from "../../components/ui/dialog";
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

export function dialogSurfaceClasses(options?: {
  readonly maxWidth?: DialogSurfaceMaxWidth | undefined;
  readonly class?: string | undefined;
}): string {
  const maxWidth = options?.maxWidth ?? "sm";
  return cn(
    DIALOG_CONTENT_CLASS,
    "flex w-[calc(100%-3rem)] flex-col",
    maxWidthClass[maxWidth],
    dialogSurfaceClass,
    options?.class,
  );
}

export type DialogSurfaceOptions = {
  readonly maxWidth?: DialogSurfaceMaxWidth | undefined;
  readonly class?: string | undefined;
  readonly ariaLabel?: string | undefined;
  readonly ariaLabelledby?: string | undefined;
  readonly ariaDescribedby?: string | undefined;
};

/**
 * Styled dialog surface builder (`div`) to pass into `ModalDialog` or `@effect/ui-kit`'s `Dialog` `popup` part.
 */
export function DialogSurface<M>(h: Html.H<M>, options: DialogSurfaceOptions = {}) {
  const maxWidth = options.maxWidth ?? "sm";
  let builder = h.div
    .attr("role", "dialog")
    .attr("aria-modal", "true")
    .attr("data-max-width", maxWidth)
    .attr("data-lisca-slot", "dialog-surface")
    .class(dialogSurfaceClasses({ maxWidth, class: options.class }));

  if (options.ariaLabel !== undefined) {
    builder = builder.attr("aria-label", options.ariaLabel);
  }
  if (options.ariaLabelledby !== undefined) {
    builder = builder.attr("aria-labelledby", options.ariaLabelledby);
  }
  if (options.ariaDescribedby !== undefined) {
    builder = builder.attr("aria-describedby", options.ariaDescribedby);
  }
  return builder;
}
