import type { HostFsEntry } from "@lisca/contracts";
import IconFileRegular from "phosphor-icons-solid/IconFileRegular";
import IconFolderRegular from "phosphor-icons-solid/IconFolderRegular";
import IconStarFill from "phosphor-icons-solid/IconStarFill";
import IconStarRegular from "phosphor-icons-solid/IconStarRegular";
import { Show } from "solid-js";
import { cn } from "../../lib/utils";

export type HostFilePickerRowProps = {
  entry: HostFsEntry;
  muted: boolean;
  selected: boolean;
  favorite?: boolean;
  onClick: (entry: HostFsEntry) => void;
  onDoubleClick: (entry: HostFsEntry) => void;
  onToggleFavorite?: (entry: HostFsEntry) => void;
};

export function HostFilePickerRow(props: HostFilePickerRowProps) {
  return (
    <li class="group flex items-center [content-visibility:auto] [contain-intrinsic-size:auto_2.5rem]">
      <button
        class={cn(
          "flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
      <Show when={props.entry.isDirectory && props.onToggleFavorite}>
        <button
          aria-label={
            props.favorite
              ? `Remove ${props.entry.name} from favorites`
              : `Add ${props.entry.name} to favorites`
          }
          aria-pressed={props.favorite ? "true" : "false"}
          class={cn(
            "inline-flex h-full shrink-0 items-center px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            props.favorite
              ? "text-primary hover:text-primary/80"
              : "text-muted-foreground/40 hover:text-foreground group-hover:text-muted-foreground",
          )}
          title={props.favorite ? "Remove from favorites" : "Add to favorites"}
          type="button"
          onClick={() => props.onToggleFavorite!(props.entry)}
        >
          {props.favorite ? <IconStarFill class="size-4" /> : <IconStarRegular class="size-4" />}
        </button>
      </Show>
    </li>
  );
}
