import { Button } from "@lisca/ui";

import type { StudioAlignState } from "../state/use-studio-align-state";

export function StudioCropStartModal({ state }: { state: StudioAlignState }) {
  const confirm = state.cropStartConfirm;
  if (!confirm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm">
      <div
        aria-labelledby="studio-crop-start-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
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
    </div>
  );
}
