import type { HostFsEntry } from "@lisca/contracts";
import { FileIcon, FolderIcon } from "lucide-solid";
import { cn } from "../../lib/utils";

export type HostFilePickerRowProps = {
  entry: HostFsEntry;
  muted: boolean;
  selected: boolean;
  onClick: (entry: HostFsEntry) => void;
  onDoubleClick: (entry: HostFsEntry) => void;
};

export function HostFilePickerRow(props: HostFilePickerRowProps) {
  return (
    <li class="[content-visibility:auto] [contain-intrinsic-size:auto_2.5rem]">
      <button
        class={cn(
          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          props.selected && "bg-primary/15",
          props.muted && "text-muted-foreground/60",
        )}
        type="button"
        onClick={() => props.onClick(props.entry)}
        onDblClick={() => props.onDoubleClick(props.entry)}
      >
        <span class="inline-flex size-4 shrink-0 text-muted-foreground">
          {props.entry.isDirectory ? (
            <FolderIcon class="size-4" aria-hidden />
          ) : (
            <FileIcon class="size-4" aria-hidden />
          )}
        </span>
        <span class="min-w-0 flex-1 truncate">{props.entry.name}</span>
      </button>
    </li>
  );
}