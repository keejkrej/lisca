import { cropConfirmCopy } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAlignCrop } from "../state/studio-align-page-selectors";

export function StudioCropConfirmModal() {
  const crop = useStudioAlignCrop();

  return (
    <Show when={crop.cropConfirm}>
      {(confirm) => {
        const copy = cropConfirmCopy({
          existingCount: confirm().existingPositions.length,
          totalCount: confirm().positions.length,
        });
        const existingList = confirm()
          .existingPositions.map((pos) => `Pos${pos}`)
          .join(", ");

        return (
          <ModalScrim zIndex="z-50">
            <DialogSurface aria-labelledby="studio-crop-confirm-title" class="p-5" maxWidth="sm">
              <div class="space-y-4">
                <div class="space-y-1">
                  <h2 id="studio-crop-confirm-title" class="font-medium text-foreground">
                    {copy.title}
                  </h2>
                  <p class="text-muted-foreground text-sm">{copy.description}</p>
                  <p class="max-h-20 overflow-auto text-muted-foreground text-xs">{existingList}</p>
                </div>
                <div class="flex justify-end gap-2">
                  <Button size="sm" type="button" variant="outline" onClick={crop.cancelCropConfirm}>
                    Cancel
                  </Button>
                  <Button size="sm" type="button" variant="outline" onClick={crop.skipExistingCrop}>
                    Skip Existing
                  </Button>
                  <Button size="sm" type="button" onClick={crop.confirmCropOverwrite}>
                    Overwrite
                  </Button>
                </div>
              </div>
            </DialogSurface>
          </ModalScrim>
        );
      }}
    </Show>
  );
}