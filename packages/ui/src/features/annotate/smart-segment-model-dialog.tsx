import { Show } from "solid-js";

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

export function SmartSegmentModelDialog(props: SmartSegmentModelDialogProps) {
  const loading = () => props.busy || props.state.progress > 0;
  const consent = () => props.state.requiresDownload && !loading();

  return (
    <Show when={props.state.open}>
      <ModalScrim zIndex="z-40">
        <DialogSurface aria-label="Smart segment model download" class="p-5" maxWidth="sm">
          <div class="font-medium text-foreground">Smart model</div>
          <p class="mt-2 text-muted-foreground text-sm">
            {consent()
              ? "Smart needs a one-time download of the SlimSAM model (~40 MB) before your first click can run."
              : loading()
                ? props.state.requiresDownload
                  ? "Downloading the SlimSAM model to your browser for local segmentation."
                  : "Loading the cached SlimSAM model from your browser."
                : "Preparing smart…"}
          </p>
          <Show when={loading()}>
            <div class="mt-4 flex items-center gap-3">
              <Spinner class="size-4" />
              <div class="min-w-0 truncate text-sm text-muted-foreground">
                {props.state.message}
              </div>
            </div>
            <div class="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full bg-primary transition-[width]"
                style={{ width: `${Math.max(0, Math.min(100, props.state.progress))}%` }}
              />
            </div>
            <div class="mt-2 text-muted-foreground text-xs tabular-nums">
              {Math.round(props.state.progress)}%
            </div>
          </Show>
          <div class="mt-4 flex gap-2">
            <Button
              class="flex-1 justify-center"
              disabled={props.busy}
              size="sm"
              type="button"
              variant="outline"
              onClick={props.onCancel}
            >
              Cancel
            </Button>
            <Show when={consent()}>
              <Button
                class="flex-1 justify-center"
                disabled={props.busy}
                size="sm"
                type="button"
                onClick={props.onConfirm}
              >
                Download model
              </Button>
            </Show>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}
