import type { Html } from "@effect/ui/html";
import { ModalScrim } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";

export type AssayOverwriteConfirmModalOptions<M> = {
  readonly key?: string | undefined;
  readonly open: boolean;
  readonly saveTo: string;
  readonly onCancel: M;
  readonly onOverwrite: M;
};

export function AssayOverwriteConfirmModal<M>(
  h: Html.H<M>,
  options: AssayOverwriteConfirmModalOptions<M>,
) {
  if (!options.open) return undefined;

  return ModalScrim(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    zIndex: "z-50",
    maxWidth: "sm",
    surfaceClass: "p-5",
    ariaLabelledby: "assay-overwrite-confirm-title",
    dismissible: false,
    children: h.div.class("space-y-4").children(
      h.div
        .class("space-y-1")
        .children(
          h.h2
            .attr("id", "assay-overwrite-confirm-title")
            .class("font-medium text-foreground")
            .children("Assay already saved here"),
          h.p
            .class("text-muted-foreground text-sm")
            .children("An assay is already saved in this workspace. Replace it?"),
          h.p
            .attr("title", options.saveTo)
            .class("truncate text-muted-foreground text-xs")
            .children(options.saveTo),
        ),
      h.div.class("flex justify-end gap-2").children(
        Button(h, {
          type: "button",
          variant: "outline",
          onPress: options.onCancel,
        }).children("Cancel"),
        Button(h, {
          class: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          type: "button",
          onPress: options.onOverwrite,
        }).children("Overwrite"),
      ),
    ),
  });
}
