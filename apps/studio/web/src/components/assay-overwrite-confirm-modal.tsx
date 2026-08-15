import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { Show } from "solid-js";

export function AssayOverwriteConfirmModal(props: {
  open: boolean;
  saveTo: string;
  onCancel: () => void;
  onOverwrite: () => void;
}) {
  return (
    <Show when={props.open}>
      <ModalScrim zIndex="z-50">
        <DialogSurface aria-labelledby="assay-overwrite-confirm-title" class="p-5" maxWidth="sm">
          <div class="space-y-4">
            <div class="space-y-1">
              <h2 id="assay-overwrite-confirm-title" class="font-medium text-foreground">
                Assay already saved here
              </h2>
              <p class="text-muted-foreground text-sm">
                An assay is already saved in this workspace. Replace it?
              </p>
              <p class="truncate text-muted-foreground text-xs" title={props.saveTo}>
                {props.saveTo}
              </p>
            </div>
            <div class="flex justify-end gap-2">
              <Button size="sm" type="button" variant="outline" onClick={props.onCancel}>
                Cancel
              </Button>
              <Button size="sm" type="button" onClick={props.onOverwrite}>
                Overwrite
              </Button>
            </div>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}
