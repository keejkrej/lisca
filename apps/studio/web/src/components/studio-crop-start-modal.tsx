import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioCropStartModal() {
  const { state } = useStudioAlignPage();

  return (
    <Show when={state.cropStartConfirm}>
      {(confirm) => (
        <ModalScrim zIndex="z-50">
          <DialogSurface aria-labelledby="studio-crop-start-title" class="p-5" maxWidth="sm">
            <div class="space-y-4">
              <div class="space-y-1">
                <h2 id="studio-crop-start-title" class="font-medium text-foreground">
                  All positions aligned
                </h2>
                <p class="text-muted-foreground text-sm">
                  {`${confirm().positions.length} positions have saved alignment output. Crop site images from the aligned grid now?`}
                </p>
              </div>
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={state.cancelCropStartConfirm}>
                  Cancel
                </Button>
                <Button type="button" onClick={state.startConfirmedCrop}>
                  Start
                </Button>
              </div>
            </div>
          </DialogSurface>
        </ModalScrim>
      )}
    </Show>
  );
}
