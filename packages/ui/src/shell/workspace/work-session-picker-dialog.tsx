import {
  formatWorkSessionWhen,
  createWorkSessionPickerState,
  workSessionPickerDescription,
  type WorkSessionPickerItem,
} from "@lisca/utils";
import type { LiscaAppId } from "@lisca/utils";
import { For, Show } from "solid-js";
import { Button } from "../../components/ui/button";
import { DialogSurface } from "../modal/dialog-surface";
import { ModalScrim } from "../modal/modal-scrim";

export type WorkSessionPickerDialogProps = {
  appId: LiscaAppId;
  open: boolean;
  sessions: WorkSessionPickerItem[];
  onRestore: (sessionId: string) => void;
  onStartNew: () => void;
};

export function WorkSessionPickerDialog(props: WorkSessionPickerDialogProps) {
  const state = () => createWorkSessionPickerState(props.open, props.sessions);

  return (
    <Show when={state().open}>
      <ModalScrim zIndex="z-50">
        <DialogSurface aria-label="Resume a recent session" class="p-5" maxWidth="sm">
          <div class="space-y-4">
            <div>
              <h2 class="font-medium text-foreground">Resume a session</h2>
              <p class="text-muted-foreground text-sm">
                {workSessionPickerDescription(props.appId)}
              </p>
            </div>
            <ul class="max-h-72 space-y-2 overflow-auto">
              <For each={state().items}>
                {(item) => (
                  <li>
                    <button
                      class="w-full rounded-md border border-border px-3 py-2 text-left hover:bg-muted"
                      type="button"
                      onClick={() => props.onRestore(item.id)}
                    >
                      <div class="font-medium text-foreground text-sm">{item.label}</div>
                      <div class="truncate text-muted-foreground text-xs">{item.path}</div>
                      <Show when={item.sourcePath}>
                        {(sourcePath) => (
                          <div class="truncate text-muted-foreground text-xs">{sourcePath()}</div>
                        )}
                      </Show>
                      <div class="text-muted-foreground text-xs">
                        {formatWorkSessionWhen(item.lastOpenedAt)}
                      </div>
                    </button>
                  </li>
                )}
              </For>
            </ul>
            <Button
              class="w-full justify-center"
              size="sm"
              type="button"
              variant="outline"
              onClick={props.onStartNew}
            >
              Start new session
            </Button>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}
