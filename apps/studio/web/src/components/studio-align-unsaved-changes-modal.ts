import type { Html } from "@effect/ui/html";
import { ModalScrim } from "@lisca/ui/patterns";
import { Button } from "@lisca/ui/primitives";

export type StudioAlignUnsavedChangesModalOptions<M> = {
  readonly open: boolean;
  readonly pos: number;
  readonly error: string | null;
  readonly saving: boolean;
  readonly onResolve: (choice: "save" | "discard" | "cancel") => M;
};

/** Asks before Back / Next / Crop / Navigation leave a position with unsaved grid or exclusions. */
export function StudioAlignUnsavedChangesModal<M>(
  h: Html.H<M>,
  options: StudioAlignUnsavedChangesModalOptions<M>,
) {
  if (!options.open) return undefined;

  return ModalScrim(h, {
    key: "align-unsaved-changes-modal",
    zIndex: "z-50",
    maxWidth: "sm",
    surfaceClass: "p-5",
    ariaLabelledby: "align-unsaved-changes-title",
    dismissible: false,
    children: h.div.class("space-y-4").children(
      h.div
        .class("space-y-1")
        .children(
          h.h2
            .attr("id", "align-unsaved-changes-title")
            .class("font-medium text-foreground")
            .children("Unsaved changes"),
          h.p
            .class("text-muted-foreground text-sm")
            .children(`Save Pos${options.pos} before leaving it?`),
          options.error
            ? h.p
                .attr("role", "alert")
                .class("z-destructive-surface text-sm")
                .children(options.error)
            : undefined,
        ),
      h.div.class("flex justify-end gap-2").children(
        Button(h, {
          disabled: options.saving,
          type: "button",
          variant: "outline",
          onPress: options.onResolve("cancel"),
        }).children("Cancel"),
        Button(h, {
          disabled: options.saving,
          type: "button",
          variant: "outline",
          onPress: options.onResolve("discard"),
        }).children("Discard"),
        Button(h, {
          disabled: options.saving,
          type: "button",
          onPress: options.onResolve("save"),
        }).children("Save"),
      ),
    ),
  });
}
