import { Button } from "lisca/viewer/ui";

import { useRoiAnnotationContext } from "./RoiAnnotationContext";

export default function RoiAnnotationDiscardDialog() {
  const { discardConfirmOpen, setDiscardConfirmOpen, onClose } = useRoiAnnotationContext();

  if (!discardConfirmOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="annotation-discard-title"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 id="annotation-discard-title" className="text-base font-medium text-foreground">
              Discard annotation changes?
            </h2>
            <p className="text-sm text-muted-foreground">
              This frame has unsaved classification or segmentation edits.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={() => setDiscardConfirmOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => {
                setDiscardConfirmOpen(false);
                onClose();
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
