import { Button } from "@lisca/ui";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm">
      <div
        aria-labelledby="assay-save-confirm-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
        role="dialog"
      >
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
      </div>
    </div>
  );
}
