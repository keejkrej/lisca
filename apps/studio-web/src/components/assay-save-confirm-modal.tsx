import { Button, DialogSurface, ModalScrim } from "@lisca/ui";

export function AssaySaveConfirmModal({
  open,
  onCancel,
  onSave,
  onSkip,
}: {
  open: boolean;
  onCancel: () => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  if (!open) return null;

  return (
    <ModalScrim zIndex="z-50">
      <DialogSurface aria-labelledby="assay-save-confirm-title" className="p-5" maxWidth="sm">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 id="assay-save-confirm-title" className="font-medium text-foreground">
              Basic info complete
            </h2>
            <p className="text-muted-foreground text-sm">
              All required basic info is filled. Save assay.json before continuing to alignment?
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={onSkip}>
              Skip Save
            </Button>
            <Button size="sm" type="button" onClick={onSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
