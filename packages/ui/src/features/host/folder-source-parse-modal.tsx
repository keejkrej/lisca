import type { FolderSource } from "@lisca/contracts";
import { useFolderSourceParseModal } from "@lisca/ui-headless/folder-source-parse-modal";
import { Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";
import type { HostFilePickerOperations } from "@lisca/utils";

export type FolderSourceParseModalProps = {
  path: string | null;
  hostPort: Pick<HostFilePickerOperations, "listDirectory">;
  onClose: () => void;
  onConfirm: (source: FolderSource) => void;
};

export function FolderSourceParseModal(props: FolderSourceParseModalProps) {
  const modal = useFolderSourceParseModal(() => ({
    path: props.path,
    hostPort: props.hostPort,
    onConfirm: props.onConfirm,
  }));

  return (
    <Show when={modal.path()}>
      <ModalScrim
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <DialogSurface aria-labelledby="folder-source-template-title" maxWidth="xl">
          <div class="border-b border-border px-5 py-4">
            <h2 class="font-semibold text-foreground text-lg" id="folder-source-template-title">
              Parse image folder
            </h2>
            <p class="mt-1 truncate text-muted-foreground text-sm" title={modal.path()!}>
              {modal.path()}
            </p>
          </div>

          <div class="flex flex-col gap-4 px-5 py-4">
            <p class="text-muted-foreground text-sm">{modal.statusMessage()}</p>

            <Field class="gap-2">
              <FieldLabel for="folder-subfolder-template">Subfolder template</FieldLabel>
              <Input
                autocomplete="off"
                id="folder-subfolder-template"
                placeholder="Pos{p}"
                type="text"
                value={modal.subfolderTemplate()}
                onInput={(event) => {
                  modal.setSubfolderTemplate(event.currentTarget.value);
                  modal.setError(null);
                }}
              />
            </Field>

            <Field class="gap-2">
              <FieldLabel for="folder-filename-template">Filename template</FieldLabel>
              <Input
                autocomplete="off"
                aria-invalid={Boolean(modal.error())}
                id="folder-filename-template"
                placeholder="img_{t}_{c}_{z}.jpg"
                type="text"
                value={modal.filenameTemplate()}
                onInput={(event) => {
                  modal.setFilenameTemplate(event.currentTarget.value);
                  modal.setError(null);
                }}
              />
              <Show when={modal.error()}>
                <p class="text-destructive text-sm">{modal.error()}</p>
              </Show>
            </Field>
          </div>

          <div class="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={modal.confirm}>
              Open
            </Button>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}
