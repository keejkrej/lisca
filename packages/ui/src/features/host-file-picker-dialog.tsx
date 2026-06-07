"use client";

import { DEFAULT_SMB_SOURCE_URL, type HostFilePickerMode } from "@lisca/contracts";
import { useHostFilePickerState } from "@lisca/ui-headless/host-file-picker-state";
import { Home, X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "../components/ui/button";
import { Field, FieldLabel } from "../components/ui/field";
import { Input } from "../components/ui/input";
import { Toggle } from "../components/ui/toggle";
import { DialogSurface } from "../shell/dialog-surface";
import { ModalScrim } from "../shell/modal-scrim";
import { HostFilePickerRow } from "./host-file-picker-row";
import type { HostFilePickerOperations } from "./host-operations";

export type HostFilePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostPort: HostFilePickerOperations;
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
          {picker.showSmb ? (
            <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/15 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Toggle
                  aria-label="Use network share (SMB)"
                  pressed={picker.useSmb}
                  size="sm"
                  variant="outline"
                  onPressedChange={picker.handleSmbToggle}
                >
                  Network share (SMB)
                </Toggle>
              </div>
              {picker.useSmb ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field className="gap-1.5 sm:col-span-2">
                    <FieldLabel htmlFor="host-file-picker-smb-url">Share URL</FieldLabel>
                    <Input
                      autoComplete="off"
                      id="host-file-picker-smb-url"
                      placeholder={DEFAULT_SMB_SOURCE_URL}
                      value={picker.smbUrl}
                      onChange={(event) => picker.setSmbUrl(event.target.value)}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="host-file-picker-smb-user">Username</FieldLabel>
                    <Input
                      autoComplete="username"
                      id="host-file-picker-smb-user"
                      placeholder="DOMAIN\\user"
                      value={picker.smbUsername}
                      onChange={(event) => picker.setSmbUsername(event.target.value)}
                    />
                  </Field>
                  <Field className="gap-1.5">
                    <FieldLabel htmlFor="host-file-picker-smb-password">Password</FieldLabel>
                    <Input
                      autoComplete="current-password"
                      id="host-file-picker-smb-password"
                      type="password"
                      value={picker.smbPassword}
                      onChange={(event) => picker.setSmbPassword(event.target.value)}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Button
                      disabled={picker.connecting || !picker.smbUrl.trim() || !picker.smbUsername.trim()}
                      size="sm"
                      type="button"
                      onClick={() => void picker.connectSmbShare()}
                    >
                      {picker.connecting ? "Connecting…" : "Connect"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!picker.canGoUp || picker.loading || !picker.browseReady}
              size="sm"
              type="button"
              variant="outline"
              onClick={picker.goUp}
            >
              Up
            </Button>
            <Button
              aria-label={picker.smbActive ? "Go to share root" : "Go to user home"}
              disabled={picker.loading || !picker.browseReady}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => void picker.goHome()}
            >
              <Home className="size-4" aria-hidden />
              {picker.smbActive ? "Share root" : "Home"}
            </Button>
          </div>

          <div className="min-h-[220px] overflow-auto rounded-md border border-border bg-background/50">
            {!picker.browseReady ? (
              <div className="flex h-[220px] items-center justify-center px-4 text-center text-muted-foreground text-sm">
                Connect to the network share to browse files.
              </div>
            ) : picker.loading ? (
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
              disabled={!picker.list?.path || picker.loading || !picker.browseReady}
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
                picker.loading ||
                !picker.browseReady
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
