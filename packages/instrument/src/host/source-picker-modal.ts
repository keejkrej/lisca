import type { Html } from "@effect/ui/html";
import { Button } from "@lisca/ui/button";
import { Icon } from "@lisca/ui/icons";
import { ModalScrim } from "@lisca/ui/patterns";

export type SourcePickerModalOptions<M> = {
  readonly key?: string | undefined;
  readonly open: boolean;
  readonly onClose: M;
  readonly onOpenFolder: M;
  readonly onOpenNd2: M;
  readonly onOpenCzi: M;
};

export type SourcePickerModalProps<M = never> = SourcePickerModalOptions<M>;

const optionClass =
  "group flex min-h-24 w-full items-center justify-center rounded-lg border border-border bg-muted/20 px-4 py-5 text-center transition-colors hover:bg-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SourcePickerModal<M>(h: Html.H<M>, options: SourcePickerModalOptions<M>) {
  if (!options.open) {
    return undefined;
  }

  return ModalScrim(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    maxWidth: "lg",
    ariaLabelledby: "open-source-title",
    onDismiss: () => options.onClose,
    children: [
      h.div.class("px-5 pb-3 pt-5").children(
        h.div.class("flex items-start justify-between gap-4").children(
          h.div
            .class("space-y-1")
            .children(
              h.h2
                .attr("id", "open-source-title")
                .class("font-semibold text-foreground text-lg")
                .children("Open Data"),
              h.p.class("text-muted-foreground text-sm").children("Choose a source format."),
            ),
          Button(h, {
            ariaLabel: "Close open data modal",
            class: "shrink-0",
            size: "icon-sm",
            type: "button",
            variant: "ghost",
            onPress: options.onClose,
          }).children(Icon(h, "x", { class: "size-4" })),
        ),
      ),
      h.div
        .class("px-5 pb-5")
        .children(
          h.div
            .class("grid grid-cols-1 gap-3 sm:grid-cols-3")
            .children(
              h.button
                .attr("type", "button")
                .class(optionClass)
                .on("click", options.onOpenFolder)
                .children(
                  h.span
                    .class("font-medium text-foreground text-lg group-hover:text-primary")
                    .children("Folder"),
                ),
              h.button
                .attr("type", "button")
                .class(optionClass)
                .on("click", options.onOpenNd2)
                .children(
                  h.span
                    .class("font-medium text-foreground text-lg group-hover:text-primary")
                    .children("ND2"),
                ),
              h.button
                .attr("type", "button")
                .class(optionClass)
                .on("click", options.onOpenCzi)
                .children(
                  h.span
                    .class("font-medium text-foreground text-lg group-hover:text-primary")
                    .children("CZI"),
                ),
            ),
        ),
    ],
  });
}
