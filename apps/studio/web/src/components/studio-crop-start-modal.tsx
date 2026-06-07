import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";;

import { useStudioAlignPage } from "../state/studio-align-page-context";

export function StudioCropStartModal() {
  const { state } = useStudioAlignPage();
  const confirm = state.cropStartConfirm;
  if (!confirm) return null;

  return (
    <ModalScrim zIndex="z-50">
      <DialogSurface aria-labelledby="studio-crop-start-title" className="p-5" maxWidth="sm">
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
      </DialogSurface>
    </ModalScrim>
  );
}
