import { Button, DialogSurface, ModalScrim } from "@lisca/ui";

export function AssaySaveConfirmModal({
  error,
  open,
  saving = false,
  onCancel,
  onSave,
  onSkip,
}: {
  error?: string | null;
  open: boolean;
  saving?: boolean;
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
              Basic info changed
            </h2>
            <p className="text-muted-foreground text-sm">
              Save assay.json before leaving basic info?
            </p>
            {error ? (
              <p className="text-destructive-foreground text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button disabled={saving} size="sm" type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button disabled={saving} size="sm" type="button" variant="outline" onClick={onSkip}>
              Skip Save
            </Button>
            <Button disabled={saving} size="sm" type="button" onClick={onSave}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
