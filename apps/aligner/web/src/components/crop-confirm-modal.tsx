import { cropConfirmCopy } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useAlignCrop } from "../state/align-page-selectors";

export function CropConfirmModal() {
  const crop = useAlignCrop();

  return (
    <Show when={crop.cropConfirm}>
      {(confirm) => {
        const copy = cropConfirmCopy({
          existingCount: confirm().existingPositions.length,
          totalCount: confirm().positions.length,
          singlePosition: confirm().kind === "single" ? confirm().positions[0] : undefined,
        });
        const existingList = confirm()
          .existingPositions.map((pos) => `Pos${pos}`)
          .join(", ");

        return (
          <ModalScrim
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) crop.cancelCropConfirm();
            }}
          >
            <DialogSurface aria-labelledby="crop-confirm-title" class="p-5" maxWidth="sm">
              <div class="space-y-4">
                <div class="space-y-1">
                  <h2 id="crop-confirm-title" class="font-medium text-foreground">
                    {copy.title}
                  </h2>
                  <p class="text-muted-foreground text-sm">{copy.description}</p>
                  <Show when={copy.showSkipExisting}>
                    <p class="max-h-20 overflow-auto text-muted-foreground text-xs">{existingList}</p>
                  </Show>
                </div>
                <div class="flex justify-end gap-2">
                  <Button size="sm" type="button" variant="outline" onClick={crop.cancelCropConfirm}>
                    Cancel
                  </Button>
                  <Show when={copy.showSkipExisting}>
                    <Button size="sm" type="button" variant="outline" onClick={crop.skipExistingCrop}>
                      Skip Existing
                    </Button>
                  </Show>
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