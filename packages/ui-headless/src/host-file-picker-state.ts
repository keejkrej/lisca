import type { HostFsEntry, HostListDirectoryResult } from "@lisca/contracts";
import type { HostFilePickerMode } from "@lisca/ui-headless/host";
import { useEffect, useState } from "react";
import type { HostFilePickerOperations } from "./host.ts";
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
export type UseHostFilePickerStateOptions = {
  open: boolean;
  mode: HostFilePickerMode;
  hostPort: HostFilePickerOperations;
  onOpenChange: (open: boolean) => void;
  onPickDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
};
export function useHostFilePickerState(options: UseHostFilePickerStateOptions) {
  const { open, hostPort, onOpenChange, onPickDirectory, onPickFile, mode } = options;
  const [list, setList] = useState<HostListDirectoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<HostFsEntry | null>(null);
  const loadPath = async (path: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const result = await hostPort.listDirectory(path);
      setList(result);
      setSelectedFile(null);
    } catch (cause) {
      setList(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await hostPort.listDirectory(null);
        if (!cancelled) {
          setList(result);
          setSelectedFile(null);
        }
      } catch (cause) {
        if (!cancelled) {
          setList(null);
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hostPort, open]);
  const dirMode = isDirectoryMode(mode);
  const canGoUp = canGoUpFromList(list);
  const locationLabel = list?.path ?? null;
  const goUp = () => {
    const parent = list?.parent;
    if (parent == null) return;
    void loadPath(parent === "" ? null : parent);
  };
  const goHome = () => {
    void loadPath(null);
  };
  const navigateToEntry = (entry: HostFsEntry) => {
    if (entry.isDirectory) void loadPath(entry.path);
  };
  const confirmDirectory = () => {
    if (!list?.path) return;
    onPickDirectory(list.path);
    onOpenChange(false);
  };
  const confirmFile = () => {
    if (!selectedFile || selectedFile.isDirectory || !fileMatchesMode(mode, selectedFile)) return;
    onPickFile(selectedFile.path);
    onOpenChange(false);
  };
  const handleRowClick = (entry: HostFsEntry) => {
    if (dirMode && entry.isDirectory) {
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
    if (entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (!dirMode && fileMatchesMode(mode, entry)) {
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
    confirmDirectory,
    confirmFile,
    handleRowClick,
    handleRowDoubleClick,
    fileMatchesMode: (entry: HostFsEntry) => fileMatchesMode(mode, entry),
  };
}
