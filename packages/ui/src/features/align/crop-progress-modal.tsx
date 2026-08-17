import type { CropRoiProgress } from "@lisca/contracts";
import { useCropProgressModal } from "@lisca/ui-headless/crop-progress-modal";
import { Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";
import { Spinner } from "../../components/ui/spinner";

export type CropProgressModalProps = {
  progress: CropRoiProgress | null | undefined;
  onCancel: () => void;
};

/** ROI crop progress overlay. Renders nothing until a job is active. */
export function CropProgressModal(props: CropProgressModalProps) {
  const state = () => useCropProgressModal(props.progress);

  return (
    <Show when={state()}>
      {(active) => (
        <ModalScrim zIndex="z-40">
          <DialogSurface aria-label="Cropping ROI output" class="p-5" maxWidth="sm">
            <div class="flex items-center gap-3">
              <Spinner class="size-4" />
              <div class="min-w-0">
                <div class="font-medium text-foreground">Cropping ROI output</div>
                <div class="truncate text-muted-foreground text-sm">{active().message}</div>
              </div>
            </div>
            <div class="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div class="h-full bg-primary" style={{ width: `${active().pct}%` }} />
            </div>
            <div class="mt-2 text-muted-foreground text-xs tabular-nums">
              {active().done} / {active().total}
            </div>
            <Button
              class="mt-4 w-full justify-center"
              type="button"
              variant="outline"
              onClick={props.onCancel}
            >
              Cancel
            </Button>
          </DialogSurface>
        </ModalScrim>
      )}
    </Show>
  );
}
