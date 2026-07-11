import type { HostFsEntry, HostListDirectoryResult } from "@lisca/contracts";
import type { HostFilePickerMode } from "@lisca/ui-headless/host";
import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { HostFilePickerOperations } from "./host";
function pathExtLower(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index).toLowerCase();
}
export function fileMatchesMode(mode: HostFilePickerMode, entry: HostFsEntry): boolean {
  if (entry.isDirectory) return false;
  const ext = pathExtLower(entry.name);
  if (mode === "nd2_file") return ext === ".nd2";
  if (mode === "czi_file") return ext === ".czi";
  if (mode === "assay_json_file") return ext === ".json";
  return false;
}
export function isDirectoryMode(mode: HostFilePickerMode): boolean {
  return mode === "workspace" || mode === "folder";
}
export function parentPathForGoUp(parent: string | null | undefined): string | null {
  if (parent == null) return null;
  return parent === "" ? null : parent;
}
export function canGoUpFromList(list: HostListDirectoryResult | null): boolean {
  return Boolean(list?.path && list.parent != null);
}

export function hostFilePickerLocationLabel(list: HostListDirectoryResult | null): string | null {
  const path = list?.path?.trim();
  return path ? path : null;
}
export type UseHostFilePickerStateOptions = {
  open: boolean;
  mode: HostFilePickerMode;
  hostPort: HostFilePickerOperations;
  onOpenChange: (open: boolean) => void;
  onPickDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
};
export function useHostFilePickerState(options: () => UseHostFilePickerStateOptions) {
  const [list, setList] = createSignal<HostListDirectoryResult | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedFile, setSelectedFile] = createSignal<HostFsEntry | null>(null);
  const loadPath = async (path: string | null) => {
    const { hostPort } = options();
    setLoading(true);
    setError(null);
    try {
      const result = await hostPort.listDirectory(path);
      setList(result);
      setSelectedFile(null);
    } catch (cause) {
      setList(null);
      setError(
        cause instanceof Error && cause.message.includes("Could not parse JSON")
          ? "Could not reach the API server. Ensure the Rust backend is running."
          : cause instanceof Error
            ? cause.message
            : String(cause),
      );
    } finally {
      setLoading(false);
    }
  };
  createEffect(() => {
    const { open, hostPort } = options();
    if (!open) return;
    let cancelled = false;
    setList(null);
    setSelectedFile(null);
    setError(null);
    setLoading(true);
    void (async () => {
      try {
        const home = await hostPort.userHomeDirectory();
        const result = await hostPort.listDirectory(home);
        if (!cancelled) {
          setList(result);
          setSelectedFile(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setList(null);
          setError(
            cause instanceof Error && cause.message.includes("Could not parse JSON")
              ? "Could not reach the API server. Ensure the Rust backend is running."
              : cause instanceof Error
                ? cause.message
                : String(cause),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    onCleanup(() => {
      cancelled = true;
    });
  });
  const dirMode = createMemo(() => isDirectoryMode(options().mode));
  const canGoUp = createMemo(() => canGoUpFromList(list()));
  const locationLabel = createMemo(() => hostFilePickerLocationLabel(list()));
  const goUp = () => {
    const currentList = list();
    const parent = currentList?.parent;
    if (parent == null) return;
    void loadPath(parent === "" ? null : parent);
  };
  const goHome = async () => {
    const { hostPort } = options();
    try {
      const home = await hostPort.userHomeDirectory();
      await loadPath(home);
    } catch (cause) {
      setList(null);
      setError(
        cause instanceof Error && cause.message.includes("Could not parse JSON")
          ? "Could not reach the API server. Ensure the Rust backend is running."
          : cause instanceof Error
            ? cause.message
            : String(cause),
      );
    }
  };
  const createDirectory = async (name: string) => {
    const { hostPort } = options();
    const currentList = list();
    if (!currentList?.path) return;
    try {
      await hostPort.createDirectory(currentList.path, name);
      await loadPath(currentList.path);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message.includes("Could not parse JSON")
          ? "Could not reach the API server. Ensure the Rust backend is running."
          : cause instanceof Error
            ? cause.message
            : String(cause),
      );
    }
  };
  const navigateToEntry = (entry: HostFsEntry) => {
    if (entry.isDirectory) void loadPath(entry.path);
  };
  const confirmDirectory = () => {
    const { onPickDirectory, onOpenChange } = options();
    const currentList = list();
    if (!currentList?.path) return;
    onPickDirectory(currentList.path);
    onOpenChange(false);
  };
  const confirmFile = () => {
    const { mode, onPickFile, onOpenChange } = options();
    const file = selectedFile();
    if (!file || file.isDirectory || !fileMatchesMode(mode, file)) return;
    onPickFile(file.path);
    onOpenChange(false);
  };
  const handleRowClick = (entry: HostFsEntry) => {
    const { mode } = options();
    if (dirMode() && entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (fileMatchesMode(mode, entry)) {
      setSelectedFile(entry);
    }
  };
  const handleRowDoubleClick = (entry: HostFsEntry) => {
    const { mode, onPickFile, onOpenChange } = options();
    if (entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (!dirMode() && fileMatchesMode(mode, entry)) {
      onPickFile(entry.path);
      onOpenChange(false);
    }
  };
  return {
    list,
    loading,
    error,
    selectedFile,
    dirMode,
    canGoUp,
    locationLabel,
    goUp,
    goHome,
    createDirectory,
    confirmDirectory,
    confirmFile,
    handleRowClick,
    handleRowDoubleClick,
    fileMatchesMode: (entry: HostFsEntry) => fileMatchesMode(options().mode, entry),
  };
}