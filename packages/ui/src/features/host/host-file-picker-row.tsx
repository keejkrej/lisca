"use client";

import type { HostFsEntry } from "@lisca/contracts";
import { FileIcon, FolderIcon } from "lucide-react";
import { cn } from "../../lib/utils";
export type HostFilePickerRowProps = {
  entry: HostFsEntry;
  muted: boolean;
  selected: boolean;
  onClick: (entry: HostFsEntry) => void;
  onDoubleClick: (entry: HostFsEntry) => void;
};
export const HostFilePickerRow = function HostFilePickerRow({
  entry,
  muted,
  selected,
  onClick,
  onDoubleClick,
}: HostFilePickerRowProps) {
  return (
    <li className="[content-visibility:auto] [contain-intrinsic-size:auto_2.5rem]">
      <button
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected && "bg-primary/15",
          muted && "text-muted-foreground/60",
        )}
        type="button"
        onClick={() => onClick(entry)}
        onDoubleClick={() => onDoubleClick(entry)}
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
};
