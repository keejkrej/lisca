"use client";

import {
  type AlignerHostPort,
  DEFAULT_FOLDER_SOURCE_TEMPLATE,
  FOLDER_SOURCE_TEMPLATE_PRESETS,
  type FolderSource,
} from "@lisca/contracts";
import { useEffect, useState } from "react";

import { Button } from "../components/ui/button";
import { Field, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { DialogSurface } from "../shell/dialog-surface";
import { ModalScrim } from "../shell/modal-scrim";

export type FolderSourceParseModalProps = {
  path: string | null;
  hostPort: Pick<AlignerHostPort, "listDirectory">;
  onClose: () => void;
  onConfirm: (source: FolderSource) => void;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function templateRegex(template: string): RegExp {
  const source = template
    .split(/(\{(?:p|position|t|time|c|channel|z)\})/g)
    .map((part) => (part.startsWith("{") && part.endsWith("}") ? "(.+?)" : escapeRegex(part)))
    .join("");
  return new RegExp(`^${source}$`, "i");
}

function filenameStem(name: string): string {
  const index = name.lastIndexOf(".");
  return index > 0 ? name.slice(0, index) : name;
}

function isSupportedImageName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    !lower.endsWith("_seg.npy") &&
    (lower.endsWith(".tif") ||
      lower.endsWith(".tiff") ||
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg"))
  );
}

async function detectFolderSourceTemplate(
  path: string,
  hostPort: Pick<AlignerHostPort, "listDirectory">,
): Promise<(typeof FOLDER_SOURCE_TEMPLATE_PRESETS)[number] | null> {
  const root = await hostPort.listDirectory(path);
  const directories = root.entries.filter((entry) => entry.isDirectory);

  for (const preset of FOLDER_SOURCE_TEMPLATE_PRESETS) {
    const subfolderRegex = templateRegex(preset.subfolderTemplate);
    const filenameRegex = templateRegex(preset.filenameTemplate);
    const matchingDirectories = directories.filter((entry) => subfolderRegex.test(entry.name));

    for (const directory of matchingDirectories.slice(0, 12)) {
      const listing = await hostPort.listDirectory(directory.path);
      const matched = listing.entries
        .filter((entry) => !entry.isDirectory && isSupportedImageName(entry.name))
        .some((entry) => filenameRegex.test(filenameStem(entry.name)));
      if (matched) return preset;
    }
  }

  return null;
}

export function FolderSourceParseModal({
  path,
  hostPort,
  onClose,
  onConfirm,
}: FolderSourceParseModalProps) {
  const [subfolderTemplate, setSubfolderTemplate] = useState<string>(
    DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate,
  );
  const [filenameTemplate, setFilenameTemplate] = useState<string>(
    DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate,
  );
  const [error, setError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setDetecting(true);
    setDetected(false);
    setError(null);

    void detectFolderSourceTemplate(path, hostPort)
      .then((preset) => {
        if (cancelled) return;
        const next = preset ?? DEFAULT_FOLDER_SOURCE_TEMPLATE;
        setSubfolderTemplate(next.subfolderTemplate);
        setFilenameTemplate(next.filenameTemplate);
        setDetected(Boolean(preset));
      })
      .catch(() => {
        if (cancelled) return;
        setSubfolderTemplate(DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate);
        setFilenameTemplate(DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate);
        setDetected(false);
      })
      .finally(() => {
        if (!cancelled) setDetecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hostPort, path]);

  if (!path) return null;

  const confirm = () => {
    const filename = filenameTemplate.trim();
    if (!filename) {
      setError("Filename template is required.");
      return;
    }

    onConfirm({
      kind: "folder",
      path,
      subfolderTemplate: subfolderTemplate.trim(),
      filenameTemplate: filename,
    });
  };

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
          <p className="mt-1 truncate text-muted-foreground text-sm" title={path}>
            {path}
          </p>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <p className="text-muted-foreground text-sm">
            {detecting
              ? "Detecting image naming pattern..."
              : detected
                ? "Detected image naming pattern."
                : "Using default image naming pattern."}
          </p>

          <Field className="gap-2" name="subfolderTemplate">
            <FieldLabel htmlFor="folder-subfolder-template">Subfolder template</FieldLabel>
            <Input
              autoComplete="off"
              id="folder-subfolder-template"
              placeholder="Pos{p}"
              type="text"
              value={subfolderTemplate}
              onChange={(event) => {
                setSubfolderTemplate(event.target.value);
                setError(null);
              }}
            />
          </Field>

          <Field className="gap-2" name="filenameTemplate">
            <FieldLabel htmlFor="folder-filename-template">Filename template</FieldLabel>
            <Input
              autoComplete="off"
              aria-invalid={Boolean(error)}
              id="folder-filename-template"
              placeholder="img_{t}_{c}_{z}.jpg"
              type="text"
              value={filenameTemplate}
              onChange={(event) => {
                setFilenameTemplate(event.target.value);
                setError(null);
              }}
            />
            {error ? <p className="text-destructive-foreground text-sm">{error}</p> : null}
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm}>
            Open
          </Button>
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
