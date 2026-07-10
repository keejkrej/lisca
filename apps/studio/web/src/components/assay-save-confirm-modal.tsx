import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { Show } from "solid-js";

export function AssaySaveConfirmModal(props: {
  error?: string | null;
  open: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  onSkip: () => void;
}) {
  return (
    <Show when={props.open}>
      <ModalScrim zIndex="z-50">
        <DialogSurface aria-labelledby="assay-save-confirm-title" class="p-5" maxWidth="sm">
          <div class="space-y-4">
            <div class="space-y-1">
              <h2 id="assay-save-confirm-title" class="font-medium text-foreground">
                Basic info changed
              </h2>
              <p class="text-muted-foreground text-sm">
                Save assay.json before leaving basic info?
              </p>
              <Show when={props.error}>
                <p class="text-destructive-foreground text-sm" role="alert">
                  {props.error}
                </p>
              </Show>
            </div>
            <div class="flex justify-end gap-2">
              <Button
                disabled={props.saving}
                size="sm"
                type="button"
                variant="outline"
                onClick={props.onCancel}
              >
                Cancel
              </Button>
              <Button
                disabled={props.saving}
                size="sm"
                type="button"
                variant="outline"
                onClick={props.onSkip}
              >
                Skip Save
              </Button>
              <Button disabled={props.saving} size="sm" type="button" onClick={props.onSave}>
                {props.saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}