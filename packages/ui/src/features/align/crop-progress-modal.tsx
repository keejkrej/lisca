import type { CropRoiProgress } from "@lisca/contracts";
import { isDoneCropStatus } from "@lisca/utils";
import { clamp } from "@lisca/utils";

import { Button } from "../../components/ui/button";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";
import { Spinner } from "../../components/ui/spinner";

export type CropProgressModalProps = {
  progress: CropRoiProgress | null | undefined;
  onCancel: () => void;
};

/** ROI crop progress overlay. Renders nothing until a job is active. */
export function CropProgressModal({ progress, onCancel }: CropProgressModalProps) {
  if (!progress || isDoneCropStatus(progress.status)) return null;

  const total = Math.max(1, progress.totalRois || progress.totalPositions || 1);
  const done = progress.totalRois ? progress.completedRois : progress.completedPositions;
  const pct = clamp((done / total) * 100, 0, 100);

  return (
    <ModalScrim zIndex="z-40">
      <DialogSurface aria-label="Cropping ROI output" className="p-5" maxWidth="sm">
        <div className="flex items-center gap-3">
          <Spinner className="size-4" />
          <div className="min-w-0">
            <div className="font-medium text-foreground">Cropping ROI output</div>
            <div className="truncate text-muted-foreground text-sm">
              {progress.message ?? "Working"}
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-muted-foreground text-xs tabular-nums">
          {done} / {total}
        </div>
        <Button
          className="mt-4 w-full justify-center"
          size="sm"
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </DialogSurface>
    </ModalScrim>
  );
}
