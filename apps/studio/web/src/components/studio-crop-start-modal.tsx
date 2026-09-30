import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";

function formatPositions(positions: number[]): string {
  const shown = positions.slice(0, 6).map((pos) => `Pos${pos}`);
  const more = positions.length - shown.length;
  return more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
}

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
                  {confirm().unaligned.length === 0
                    ? "All positions aligned"
                    : "Not all positions aligned"}
                </h2>
                <p class="text-muted-foreground text-sm">
                  {confirm().unaligned.length === 0
                    ? `${confirm().positions.length} positions have saved alignment output. Crop site images from the aligned grid now?`
                    : `${confirm().positions.length - confirm().unaligned.length} of ${confirm().positions.length} positions aligned. Save an alignment for ${formatPositions(confirm().unaligned)} before cropping.`}
                </p>
              </div>
              <div class="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={state.cancelCropStartConfirm}>
                  Cancel
                </Button>
                <Show
                  when={confirm().unaligned.length === 0}
                  fallback={
                    <Button type="button" onClick={state.goToUnalignedPosition}>
                      Go to unaligned
                    </Button>
                  }
                >
                  <Button type="button" onClick={state.startConfirmedCrop}>
                    Start
                  </Button>
                </Show>
              </div>
            </div>
          </DialogSurface>
        </ModalScrim>
      )}
    </Show>
  );
}
