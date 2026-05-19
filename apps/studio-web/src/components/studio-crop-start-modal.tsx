import { Button, cn, surfaceDialogClass, ModalScrim } from "@lisca/ui";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioCropStartModal({ state }: { state: StudioAlignState }) {
  const confirm = state.cropStartConfirm;
  if (!confirm) return null;

  return (
    <ModalScrim zIndex="z-50">
      <div
        aria-labelledby="studio-crop-start-title"
        aria-modal="true"
        className={cn("w-full max-w-md p-5", surfaceDialogClass)}
        role="dialog"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 id="studio-crop-start-title" className="font-medium text-foreground">
              All positions aligned
            </h2>
            <p className="text-muted-foreground text-sm">
              {`${confirm.positions.length} positions have saved alignment output. Start cropping ROI output now?`}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={state.cancelCropStartConfirm}
            >
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={state.startConfirmedCrop}>
              Start
            </Button>
          </div>
        </div>
      </div>
    </ModalScrim>
  );
}
