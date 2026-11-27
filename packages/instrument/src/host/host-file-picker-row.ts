import type { Html } from "@effect/ui/html";
import type { HostFsEntry } from "@lisca/contracts";
import { cn } from "@lisca/ui/cn";
import { Icon } from "@lisca/ui/icons";

export type HostFilePickerRowOptions<M> = {
  readonly entry: HostFsEntry;
  readonly muted: boolean;
  readonly selected: boolean;
  readonly favorite?: boolean | undefined;
  readonly onClick: M;
  readonly onDoubleClick: M;
  readonly onToggleFavorite?: M | undefined;
};

export function HostFilePickerRow<M>(h: Html.H<M>, options: HostFilePickerRowOptions<M>) {
  return h.li
    .key(options.entry.path)
    .class("group flex items-center [content-visibility:auto] [contain-intrinsic-size:auto_2.5rem]")
    .children(
      h.button
        .attr("type", "button")
        .class(
          cn(
            "flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            options.selected && "bg-accent/50",
            options.muted && "text-muted-foreground/60",
          ),
        )
        .on("click", options.onClick)
        .on("dblclick", options.onDoubleClick)
        .children(
          h.span
            .class("inline-flex size-4 shrink-0 text-muted-foreground")
            .children(Icon(h, options.entry.isDirectory ? "folder" : "file", { class: "size-4" })),
          h.span.class("min-w-0 flex-1 truncate").children(options.entry.name),
        ),
      options.entry.isDirectory && options.onToggleFavorite !== undefined
        ? h.button
            .attr("type", "button")
            .attr(
              "aria-label",
              options.favorite
                ? `Remove ${options.entry.name} from favorites`
                : `Add ${options.entry.name} to favorites`,
            )
            .attr("aria-pressed", options.favorite ? "true" : "false")
            .attr("title", options.favorite ? "Remove from favorites" : "Add to favorites")
            .class(
              cn(
                "inline-flex h-full shrink-0 items-center px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                options.favorite
                  ? "text-primary hover:text-primary/80"
                  : "text-muted-foreground/40 hover:text-foreground group-hover:text-muted-foreground",
              ),
            )
            .on("click", options.onToggleFavorite)
            .children(
              Icon(h, options.favorite ? "star-fill" : "star", {
                class: "size-4",
              }),
            )
        : undefined,
    );
}
