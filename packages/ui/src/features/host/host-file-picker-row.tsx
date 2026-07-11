import type { HostFsEntry } from "@lisca/contracts";
import IconFileRegular from "phosphor-icons-solid/IconFileRegular";
import IconFolderRegular from "phosphor-icons-solid/IconFolderRegular";
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
          props.selected && "bg-accent/50",
          props.muted && "text-muted-foreground/60",
        )}
        type="button"
        onClick={() => props.onClick(props.entry)}
        onDblClick={() => props.onDoubleClick(props.entry)}
      >
        <span class="inline-flex size-4 shrink-0 text-muted-foreground">
          {props.entry.isDirectory ? (
            <IconFolderRegular class="size-4" />
          ) : (
            <IconFileRegular class="size-4" />
          )}
        </span>
        <span class="min-w-0 flex-1 truncate">{props.entry.name}</span>
      </button>
    </li>
  );
}