import { Button } from "../../components/ui/button";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";
import { Spinner } from "../../components/ui/spinner";

export type SmartSegmentModelDialogProps = {
  state: {
    open: boolean;
    requiresDownload: boolean;
    progress: number;
    message: string;
    file?: string;
  };
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function SmartSegmentModelDialog({
  state,
  busy,
  onConfirm,
  onCancel,
}: SmartSegmentModelDialogProps) {
  if (!state.open) return null;

  const loading = busy || state.progress > 0;
  const consent = state.requiresDownload && !loading;

  return (
    <ModalScrim zIndex="z-40">
      <DialogSurface aria-label="Smart segment model download" className="p-5" maxWidth="sm">
        <div className="font-medium text-foreground">Smart model</div>
        <p className="mt-2 text-muted-foreground text-sm">
          {consent
            ? "Smart needs a one-time download of the SlimSAM model (~40 MB) before your first click can run."
            : loading
              ? state.requiresDownload
                ? "Downloading the SlimSAM model to your browser for local segmentation."
                : "Loading the cached SlimSAM model from your browser."
              : "Preparing smart…"}
        </p>
        {loading ? (
          <>
            <div className="mt-4 flex items-center gap-3">
              <Spinner className="size-4" />
              <div className="min-w-0 truncate text-sm text-muted-foreground">{state.message}</div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.max(0, Math.min(100, state.progress))}%` }}
              />
            </div>
            <div className="mt-2 text-muted-foreground text-xs tabular-nums">
              {Math.round(state.progress)}%
            </div>
          </>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1 justify-center"
            disabled={busy}
            size="sm"
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          {consent ? (
            <Button
              className="flex-1 justify-center"
              disabled={busy}
              size="sm"
              type="button"
              onClick={onConfirm}
            >
              Download model
            </Button>
          ) : null}
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
