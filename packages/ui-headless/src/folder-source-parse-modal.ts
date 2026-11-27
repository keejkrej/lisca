import type { FolderSource } from "@lisca/contracts";
import { DEFAULT_FOLDER_SOURCE_TEMPLATE } from "@lisca/contracts/assay";
import { detectFolderSourceTemplate, type ListDirectoryHostPort } from "@lisca/utils";

export type FolderSourceParseModalOptions = {
  path?: string | null | undefined;
  hostPort: ListDirectoryHostPort;
  onConfirm: (source: FolderSource) => void;
};

export type UseFolderSourceParseModalOptions = FolderSourceParseModalOptions;

export type FolderSourceParseModalState = {
  path: string | null;
  subfolderTemplate: string;
  filenameTemplate: string;
  error: string | null;
  detecting: boolean;
  detected: boolean;
  statusMessage: string;
};

export type FolderSourceParseModalListener = (state: FolderSourceParseModalState) => void;

export type FolderSourceParseModalController = {
  getState: () => FolderSourceParseModalState;
  subscribe: (listener: FolderSourceParseModalListener) => () => void;
  openForPath: (path: string | null) => void;
  setSubfolderTemplate: (value: string) => void;
  setFilenameTemplate: (value: string) => void;
  setError: (value: string | null) => void;
  confirm: () => void;
  dispose: () => void;
};

export function folderParseConfirmError(args: {
  path: string | null;
  filenameTemplate: string;
}): string | null {
  if (!args.path) return null;
  if (!args.filenameTemplate.trim()) return "Filename template is required.";
  return null;
}

function buildStatusMessage(detecting: boolean, detected: boolean): string {
  return detecting
    ? "Detecting image naming pattern…"
    : detected
      ? "Detected image naming pattern."
      : "Using default image naming pattern.";
}

export function createFolderSourceParseModal(
  options: FolderSourceParseModalOptions,
): FolderSourceParseModalController {
  let path: string | null = null;
  let subfolderTemplate: string = DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate;
  let filenameTemplate: string = DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate;
  let error: string | null = null;
  let detecting = false;
  let detected = false;
  let generation = 0;
  let disposed = false;
  const listeners = new Set<FolderSourceParseModalListener>();

  const buildSnapshot = (): FolderSourceParseModalState => ({
    path,
    subfolderTemplate,
    filenameTemplate,
    error,
    detecting,
    detected,
    statusMessage: buildStatusMessage(detecting, detected),
  });

  let snapshot = buildSnapshot();

  const emit = () => {
    snapshot = buildSnapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const openForPath = (nextPath: string | null) => {
    if (disposed) return;
    generation += 1;
    const currentGeneration = generation;
    path = nextPath;
    if (!nextPath) {
      detecting = false;
      emit();
      return;
    }

    detecting = true;
    detected = false;
    error = null;
    emit();

    void detectFolderSourceTemplate(nextPath, options.hostPort)
      .then((preset) => {
        if (disposed || currentGeneration !== generation) return;
        const next = preset ?? DEFAULT_FOLDER_SOURCE_TEMPLATE;
        subfolderTemplate = next.subfolderTemplate;
        filenameTemplate = next.filenameTemplate;
        detected = Boolean(preset);
        detecting = false;
        emit();
      })
      .catch(() => {
        if (disposed || currentGeneration !== generation) return;
        subfolderTemplate = DEFAULT_FOLDER_SOURCE_TEMPLATE.subfolderTemplate;
        filenameTemplate = DEFAULT_FOLDER_SOURCE_TEMPLATE.filenameTemplate;
        detected = false;
        detecting = false;
        emit();
      });
  };

  const setSubfolderTemplate = (value: string) => {
    if (disposed || subfolderTemplate === value) return;
    subfolderTemplate = value;
    emit();
  };

  const setFilenameTemplate = (value: string) => {
    if (disposed || filenameTemplate === value) return;
    filenameTemplate = value;
    emit();
  };

  const setError = (value: string | null) => {
    if (disposed || error === value) return;
    error = value;
    emit();
  };

  const confirm = () => {
    const validationError = folderParseConfirmError({ path, filenameTemplate });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!path) return;

    options.onConfirm({
      kind: "folder",
      path,
      subfolderTemplate: subfolderTemplate.trim(),
      filenameTemplate: filenameTemplate.trim(),
    });
  };

  if (options.path) {
    openForPath(options.path);
  }

  return {
    getState: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    openForPath,
    setSubfolderTemplate,
    setFilenameTemplate,
    setError,
    confirm,
    dispose: () => {
      disposed = true;
      generation += 1;
      listeners.clear();
    },
  };
}
