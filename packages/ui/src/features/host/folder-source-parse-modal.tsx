"use client";

import type { FolderSource } from "@lisca/contracts";
import { useFolderSourceParseModal } from "@lisca/ui-headless/folder-source-parse-modal";

import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";
import type { HostFilePickerOperations } from "./host-operations";

export type FolderSourceParseModalProps = {
  path: string | null;
  hostPort: Pick<HostFilePickerOperations, "listDirectory">;
  onClose: () => void;
  onConfirm: (source: FolderSource) => void;
};

export function FolderSourceParseModal({
  path,
  hostPort,
  onClose,
  onConfirm,
}: FolderSourceParseModalProps) {
  const modal = useFolderSourceParseModal({ path, hostPort, onConfirm });

  if (!modal.path) return null;

  return (
    <ModalScrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <DialogSurface aria-labelledby="folder-source-template-title" maxWidth="xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground text-lg" id="folder-source-template-title">
            Parse image folder
          </h2>
          <p className="mt-1 truncate text-muted-foreground text-sm" title={modal.path}>
            {modal.path}
          </p>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-muted-foreground text-sm">{modal.statusMessage}</p>

          <Field className="gap-2" name="subfolderTemplate">
            <FieldLabel htmlFor="folder-subfolder-template">Subfolder template</FieldLabel>
            <Input
              autoComplete="off"
              id="folder-subfolder-template"
              placeholder="Pos{p}"
              type="text"
              value={modal.subfolderTemplate}
              onChange={(event) => {
                modal.setSubfolderTemplate(event.target.value);
                modal.setError(null);
              }}
            />
          </Field>

          <Field className="gap-2" name="filenameTemplate">
            <FieldLabel htmlFor="folder-filename-template">Filename template</FieldLabel>
            <Input
              autoComplete="off"
              aria-invalid={Boolean(modal.error)}
              id="folder-filename-template"
              placeholder="img_{t}_{c}_{z}.jpg"
              type="text"
              value={modal.filenameTemplate}
              onChange={(event) => {
                modal.setFilenameTemplate(event.target.value);
                modal.setError(null);
              }}
            />
            {modal.error ? <p className="text-destructive-foreground text-sm">{modal.error}</p> : null}
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={modal.confirm}>
            Open
          </Button>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
