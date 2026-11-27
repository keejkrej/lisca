import type { Html } from "@effect/ui/html";
import { cropConfirmCopy } from "@lisca/instrument";
import { ModalScrim } from "@lisca/ui/patterns";
import { Button, ScrollArea } from "@lisca/ui/primitives";

import type { CropConfirmState } from "../state/use-studio-align-state";

export type StudioCropConfirmModalOptions<M> = {
  readonly confirm: CropConfirmState | null;
  readonly onCancel: M;
  readonly onSkipExisting: M;
  readonly onOverwrite: M;
};

export function StudioCropConfirmModal<M>(h: Html.H<M>, options: StudioCropConfirmModalOptions<M>) {
  const confirm = options.confirm;
  if (!confirm) return undefined;

  const copy = cropConfirmCopy({
    existingCount: confirm.existingPositions.length,
    totalCount: confirm.positions.length,
  });
  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return ModalScrim(h, {
    key: "studio-crop-confirm-modal",
    zIndex: "z-50",
    maxWidth: "sm",
    surfaceClass: "p-5",
    ariaLabelledby: "studio-crop-confirm-title",
    dismissible: false,
    children: h.div.class("space-y-4").children(
      h.div.class("space-y-1").children(
        h.h2
          .attr("id", "studio-crop-confirm-title")
          .class("font-medium text-foreground")
          .children(copy.title),
        h.p.class("text-muted-foreground text-sm").children(copy.description),
        ScrollArea(h, {
          key: "studio-crop-confirm-list",
          viewportClass: "max-h-20",
          children: h.p.class("text-muted-foreground text-xs").children(existingList),
        }),
      ),
      h.div.class("flex justify-end gap-2").children(
        Button(h, {
          type: "button",
          variant: "outline",
          onPress: options.onCancel,
        }).children("Cancel"),
        Button(h, {
          type: "button",
          variant: "outline",
          onPress: options.onSkipExisting,
        }).children("Skip Existing"),
        Button(h, {
          class: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          type: "button",
          onPress: options.onOverwrite,
        }).children("Overwrite"),
      ),
    ),
  });
}
