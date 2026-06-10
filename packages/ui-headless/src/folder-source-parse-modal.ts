import type { FolderSource } from "@lisca/contracts";
import { DEFAULT_FOLDER_SOURCE_TEMPLATE } from "@lisca/contracts/assay";
import { detectFolderSourceTemplate, type ListDirectoryHostPort } from "@lisca/utils";
import { useEffect, useState } from "react";

export type UseFolderSourceParseModalOptions = {
  path: string | null;
  hostPort: ListDirectoryHostPort;
  onConfirm: (source: FolderSource) => void;
};

export function folderParseConfirmError(args: {
  path: string | null;
  filenameTemplate: string;
}): string | null {
  if (!args.path) return null;
  if (!args.filenameTemplate.trim()) return "Filename template is required.";
  return null;
}

export function useFolderSourceParseModal(options: UseFolderSourceParseModalOptions) {
  const { path, hostPort, onConfirm } = options;
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

  const statusMessage = detecting
    ? "Detecting image naming pattern..."
    : detected
      ? "Detected image naming pattern."
      : "Using default image naming pattern.";

  const confirm = () => {
    const validationError = folderParseConfirmError({ path, filenameTemplate });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!path) return;

    onConfirm({
      kind: "folder",
      path,
      subfolderTemplate: subfolderTemplate.trim(),
      filenameTemplate: filenameTemplate.trim(),
    });
  };

  return {
    path,
    subfolderTemplate,
    setSubfolderTemplate,
    filenameTemplate,
    setFilenameTemplate,
    error,
    setError,
    detecting,
    detected,
    statusMessage,
    confirm,
  };
}
