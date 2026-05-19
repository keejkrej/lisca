import { Button, cn, surfaceDialogClass } from "@lisca/ui";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioCropConfirmModal({ state }: { state: StudioAlignState }) {
  const confirm = state.cropConfirm;
  if (!confirm) return null;

  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm">
      <div
        aria-labelledby="studio-crop-confirm-title"
        aria-modal="true"
        className={cn("w-full max-w-md p-5", surfaceDialogClass)}
        role="dialog"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 id="studio-crop-confirm-title" className="font-medium text-foreground">
              ROI output already exists
            </h2>
            <p className="text-muted-foreground text-sm">
              {`${confirm.existingPositions.length} of ${confirm.positions.length} saved positions already have ROI output. Overwrite those folders or skip them and crop only the remaining positions.`}
            </p>
            <p className="max-h-20 overflow-auto text-muted-foreground text-xs">{existingList}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" type="button" variant="outline" onClick={state.cancelCropConfirm}>
              Cancel
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={state.skipExistingCrop}>
              Skip Existing
            </Button>
            <Button size="sm" type="button" onClick={state.confirmCropOverwrite}>
              Overwrite
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
