import { Button, cn, surfaceDialogClass } from "@lisca/ui";

export function AssayOverwriteConfirmModal({
  open,
  saveTo,
  onCancel,
  onOverwrite,
}: {
  open: boolean;
  saveTo: string;
  onCancel: () => void;
  onOverwrite: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm">
      <div
        aria-labelledby="assay-overwrite-confirm-title"
        aria-modal="true"
        className={cn("w-full max-w-md p-5", surfaceDialogClass)}
        role="dialog"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 id="assay-overwrite-confirm-title" className="font-medium text-foreground">
              assay.json already exists
            </h2>
            <p className="text-muted-foreground text-sm">
              Overwrite the existing assay.json in this save folder?
            </p>
            <p className="truncate text-muted-foreground text-xs" title={saveTo}>
              {saveTo}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={onOverwrite}>
              Overwrite
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
