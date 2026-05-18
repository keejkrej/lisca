"use client";

import type {
  AlignerHostPort,
  HostFilePickerMode,
  HostFsEntry,
  HostListDirectoryResult,
} from "@lisca/contracts";
import { FileIcon, FolderIcon, Home, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";

function pathExtLower(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index).toLowerCase();
}

function fileMatchesMode(mode: HostFilePickerMode, entry: HostFsEntry): boolean {
  if (entry.isDirectory) return false;
  const ext = pathExtLower(entry.name);
  if (mode === "nd2_file") return ext === ".nd2";
  if (mode === "czi_file") return ext === ".czi";
  if (mode === "assay_json_file") return ext === ".json";
  return false;
}

function isDirectoryMode(mode: HostFilePickerMode): boolean {
  return mode === "workspace" || mode === "folder";
}

export type HostFilePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostPort: Pick<AlignerHostPort, "listDirectory" | "userHomeDirectory">;
  mode: HostFilePickerMode;
  title: string;
  description?: string;
  onPickDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
};

export function HostFilePickerDialog({
  open,
  onOpenChange,
  hostPort,
  mode,
  title,
  description,
  onPickDirectory,
  onPickFile,
}: HostFilePickerDialogProps) {
  const [list, setList] = useState<HostListDirectoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<HostFsEntry | null>(null);

  const loadPath = useCallback(
    async (path: string | null) => {
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
    },
    [hostPort],
  );

  useEffect(() => {
    if (!open) return;
    void loadPath(null);
  }, [open, loadPath]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  const dirMode = isDirectoryMode(mode);
  const canGoUp = Boolean(list?.path);
  const locationLabel = list?.path ?? null;

  const goUp = () => {
    if (!list) return;
    if (list.parent) {
      void loadPath(list.parent);
    } else if (list.path) {
      void loadPath(null);
    }
  };

  const goHome = async () => {
    try {
      const home = await hostPort.userHomeDirectory();
      await loadPath(home);
    } catch (cause) {
      setList(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <div
        aria-labelledby="host-file-picker-title"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground text-lg" id="host-file-picker-title">
              {title}
            </h2>
            {locationLabel ? (
              <p className="truncate text-muted-foreground text-sm" title={locationLabel}>
                {locationLabel}
              </p>
            ) : null}
            {description ? (
              <p className="mt-1 text-muted-foreground text-sm">{description}</p>
            ) : null}
          </div>
          <Button
            aria-label="Close file picker"
            className="shrink-0"
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!canGoUp || loading}
              size="sm"
              type="button"
              variant="outline"
              onClick={goUp}
            >
              Up
            </Button>
            <Button
              aria-label="Go to user home"
              disabled={loading}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void goHome()}
            >
              <Home className="size-4" aria-hidden />
              Home
            </Button>
          </div>

          <div className="min-h-[220px] overflow-auto rounded-md border border-border bg-background/50">
            {loading ? (
              <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
                Loading...
              </div>
            ) : error ? (
              <div className="p-3 text-destructive-foreground text-sm">{error}</div>
            ) : (list?.entries ?? []).length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
                No entries.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {(list?.entries ?? []).map((entry) => {
                  const selected = selectedFile?.path === entry.path && !entry.isDirectory;
                  const muted = !entry.isDirectory && !dirMode && !fileMatchesMode(mode, entry);
                  return (
                    <li key={entry.path}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected && "bg-primary/15",
                          muted && "text-muted-foreground/60",
                        )}
                        type="button"
                        onClick={() => handleRowClick(entry)}
                        onDoubleClick={() => handleRowDoubleClick(entry)}
                      >
                        <span className="inline-flex size-4 shrink-0 text-muted-foreground">
                          {entry.isDirectory ? (
                            <FolderIcon className="size-4" aria-hidden />
                          ) : (
                            <FileIcon className="size-4" aria-hidden />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {dirMode ? (
            <Button disabled={!list?.path || loading} type="button" onClick={confirmDirectory}>
              Select folder
            </Button>
          ) : (
            <Button
              disabled={
                !selectedFile ||
                selectedFile.isDirectory ||
                !fileMatchesMode(mode, selectedFile) ||
                loading
              }
              type="button"
              onClick={confirmFile}
            >
              Select file
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
