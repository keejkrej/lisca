import { Button } from "@lisca/ui/components";
import { DialogSurface, ModalScrim } from "@lisca/ui/shell";
import { Show } from "solid-js";

import { useStudioAlignPage } from "../state/studio-align-page-context";

/** Asks before Back / Next / Crop / Navigation leave a position with unsaved grid or exclusions. */
export function StudioAlignUnsavedChangesModal() {
  const { state } = useStudioAlignPage();

  return (
    <Show when={state.unsavedChangesPrompt}>
      <ModalScrim zIndex="z-50">
        <DialogSurface aria-labelledby="align-unsaved-changes-title" class="p-5" maxWidth="sm">
          <div class="space-y-4">
            <div class="space-y-1">
              <h2 id="align-unsaved-changes-title" class="font-medium text-foreground">
                Unsaved changes
              </h2>
              <p class="text-muted-foreground text-sm">
                Save Pos{state.selection.pos} before leaving it?
              </p>
              <Show when={state.error}>
                <p class="z-destructive-surface text-sm" role="alert">
                  {state.error}
                </p>
              </Show>
            </div>
            <div class="flex justify-end gap-2">
              <Button
                disabled={state.saving}
                type="button"
                variant="outline"
                onClick={() => void state.resolveUnsavedChanges("cancel")}
              >
                Cancel
              </Button>
              <Button
                disabled={state.saving}
                type="button"
                variant="outline"
                onClick={() => void state.resolveUnsavedChanges("discard")}
              >
                Discard
              </Button>
              <Button
                disabled={state.saving}
                type="button"
                onClick={() => void state.resolveUnsavedChanges("save")}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}
