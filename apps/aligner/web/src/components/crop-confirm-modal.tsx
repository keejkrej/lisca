import { cropConfirmCopy } from "@lisca/ui/features";
import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";

import { useAlignCrop } from "../state/align-page-selectors";

export function CropConfirmModal() {
  const crop = useAlignCrop();
  const confirm = crop.cropConfirm;
  if (!confirm) return null;

  const copy = cropConfirmCopy({
    existingCount: confirm.existingPositions.length,
    totalCount: confirm.positions.length,
    singlePosition: confirm.kind === "single" ? confirm.positions[0] : undefined,
  });
  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <ModalScrim>
      <DialogSurface aria-labelledby="crop-confirm-title" className="p-5" maxWidth="sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 id="crop-confirm-title" className="font-medium text-foreground">
              {copy.title}
            </h2>
            <p className="text-muted-foreground text-sm">{copy.description}</p>
            {copy.showSkipExisting ? (
              <p className="max-h-20 overflow-auto text-muted-foreground text-xs">{existingList}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" type="button" variant="outline" onClick={crop.cancelCropConfirm}>
              Cancel
            </Button>
            {copy.showSkipExisting ? (
              <Button size="sm" type="button" variant="outline" onClick={crop.skipExistingCrop}>
                Skip Existing
              </Button>
            ) : null}
            <Button size="sm" type="button" onClick={crop.confirmCropOverwrite}>
              Overwrite
            </Button>
          </div>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
