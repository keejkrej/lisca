import type { Html } from "@effect/ui/html";
import { ModalScrim } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";

export type AssaySaveConfirmModalOptions<M> = {
  readonly key?: string | undefined;
  readonly error?: string | null | undefined;
  readonly open: boolean;
  readonly saving?: boolean | undefined;
  readonly onCancel: M;
  readonly onSave: M;
  readonly onSkip: M;
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly skipLabel?: string | undefined;
};

export function AssaySaveConfirmModal<M>(h: Html.H<M>, options: AssaySaveConfirmModalOptions<M>) {
  if (!options.open) return undefined;

  return ModalScrim(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    zIndex: "z-50",
    maxWidth: "sm",
    surfaceClass: "p-5",
    ariaLabelledby: "assay-save-confirm-title",
    dismissible: false,
    children: h.div.class("space-y-4").children(
      h.div.class("space-y-1").children(
        h.h2
          .attr("id", "assay-save-confirm-title")
          .class("font-medium text-foreground")
          .children(options.title ?? "Metadata changed"),
        h.p
          .class("text-muted-foreground text-sm")
          .children(options.description ?? "Save these settings before leaving the Metadata step?"),
        options.error
          ? h.p.attr("role", "alert").class("z-destructive-surface text-sm").children(options.error)
          : undefined,
      ),
      h.div.class("flex justify-end gap-2").children(
        Button(h, {
          disabled: options.saving,
          type: "button",
          variant: "outline",
          onPress: options.onCancel,
        }).children("Cancel"),
        Button(h, {
          disabled: options.saving,
          type: "button",
          variant: "outline",
          onPress: options.onSkip,
        }).children(options.skipLabel ?? "Skip Save"),
        Button(h, {
          disabled: options.saving,
          type: "button",
          onPress: options.onSave,
        }).children("Save"),
      ),
    ),
  });
}
