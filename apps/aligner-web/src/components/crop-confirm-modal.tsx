import { Button } from "@lisca/ui";

import type { AlignState } from "../state/use-align-state";

export function CropConfirmModal({ state }: { state: AlignState }) {
  const confirm = state.cropConfirm;
  if (!confirm) return null;

  const existingList = confirm.existingPositions.map((pos) => `Pos${pos}`).join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm">
      <div
        aria-labelledby="crop-confirm-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
        role="dialog"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 id="crop-confirm-title" className="font-medium text-foreground">
              ROI output already exists
            </h2>
            <p className="text-muted-foreground text-sm">
              {confirm.kind === "single"
                ? `roi/Pos${confirm.positions[0]} already exists. Overwrite the existing cropped ROI files for this position?`
                : `${confirm.existingPositions.length} of ${confirm.positions.length} saved positions already have ROI output. Overwrite those folders or skip them and crop only the remaining positions.`}
            </p>
            {confirm.kind === "batch" ? (
              <p className="max-h-20 overflow-auto text-muted-foreground text-xs">{existingList}</p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" type="button" variant="outline" onClick={state.cancelCropConfirm}>
              Cancel
            </Button>
            {confirm.kind === "batch" ? (
              <Button size="sm" type="button" variant="outline" onClick={state.skipExistingCrop}>
                Skip Existing
              </Button>
            ) : null}
            <Button size="sm" type="button" onClick={state.confirmCropOverwrite}>
              Overwrite
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
