"use client";

import type { HostFilePickerMode } from "@lisca/ui-headless/host";
import { useHostFilePickerState } from "@lisca/ui-headless/host-file-picker-state";
import { Home, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "../../components/ui/button";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";
import { HostFilePickerRow } from "./host-file-picker-row";
import type { HostFilePickerOperations } from "./host-operations";

export type HostFilePickerRecentItem = {
  path: string;
  label?: string;
};

export type HostFilePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostPort: HostFilePickerOperations;
  mode: HostFilePickerMode;
  title: string;
  description?: string;
  recentItems?: readonly HostFilePickerRecentItem[];
  onPickRecent?: (path: string) => void;
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
  recentItems,
  onPickRecent,
  onPickDirectory,
  onPickFile,
}: HostFilePickerDialogProps) {
  const picker = useHostFilePickerState({
    open,
    mode,
    hostPort,
    onOpenChange,
    onPickDirectory,
    onPickFile,
  });

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <ModalScrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <DialogSurface
        aria-labelledby="host-file-picker-title"
        className="max-h-[86vh]"
        maxWidth="2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-foreground text-lg" id="host-file-picker-title">
              {title}
            </h2>
            {picker.locationLabel ? (
              <p className="truncate text-muted-foreground text-sm" title={picker.locationLabel}>
                {picker.locationLabel}
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
          {recentItems && recentItems.length > 0 && onPickRecent ? (
            <div className="space-y-2">
              <p className="font-medium text-foreground text-sm">Recent</p>
              <ul className="max-h-32 overflow-auto rounded-md border border-border divide-y divide-border/60">
                {recentItems.map((item) => (
                  <li key={item.path}>
                    <button
                      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30"
                      type="button"
                      onClick={() => onPickRecent(item.path)}
                    >
                      {item.label ? (
                        <span className="font-medium text-foreground">{item.label}</span>
                      ) : null}
                      <span className="truncate text-muted-foreground" title={item.path}>
                        {item.path}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!picker.canGoUp || picker.loading}
              size="sm"
              type="button"
              variant="outline"
              onClick={picker.goUp}
            >
              Up
            </Button>
            <Button
              aria-label="Go to browse roots"
              disabled={picker.loading}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void picker.goHome()}
            >
              <Home className="size-4" aria-hidden />
              Home
            </Button>
          </div>

          <div className="min-h-[220px] overflow-auto rounded-md border border-border bg-background/50">
            {picker.loading ? (
              <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
                Loading…
              </div>
            ) : picker.error ? (
              <div className="p-3 text-destructive-foreground text-sm">{picker.error}</div>
            ) : (picker.list?.entries ?? []).length === 0 ? (
              <div className="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
                No entries.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {(picker.list?.entries ?? []).map((entry) => (
                  <HostFilePickerRow
                    key={entry.path}
                    entry={entry}
                    muted={!entry.isDirectory && !picker.dirMode && !picker.fileMatchesMode(entry)}
                    selected={picker.selectedFile?.path === entry.path && !entry.isDirectory}
                    onClick={picker.handleRowClick}
                    onDoubleClick={picker.handleRowDoubleClick}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {picker.dirMode ? (
            <Button
              disabled={!picker.list?.path || picker.loading}
              type="button"
              onClick={picker.confirmDirectory}
            >
              Select folder
            </Button>
          ) : (
            <Button
              disabled={
                !picker.selectedFile ||
                picker.selectedFile.isDirectory ||
                !picker.fileMatchesMode(picker.selectedFile) ||
                picker.loading
              }
              type="button"
              onClick={picker.confirmFile}
            >
              Select file
            </Button>
          )}
        </div>
      </DialogSurface>
    </ModalScrim>
  );
}
