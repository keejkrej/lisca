import type { View } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import {
  groupResultPlots,
  resultGridColumns,
  type ResultPlot,
  type ResultPlotSection,
} from "@lisca/analysis";

function GalleryEmpty<M, R = never>(
  h: Html.H<M>,
  options: {
    readonly title?: string | undefined;
    readonly message?: string | undefined;
    readonly action?: View.Input<M, R> | undefined;
  },
) {
  return h.div
    .class("flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 py-10 text-center")
    .children(
      options.title ? h.p.class("font-medium text-foreground").children(options.title) : undefined,
      options.message
        ? h.p
            .class("max-w-sm text-sm leading-relaxed text-muted-foreground")
            .children(options.message)
        : undefined,
      options.action,
    );
}

export type AnalysisPlotGalleryOptions<M, R = never> = {
  readonly plots: readonly ResultPlot[];
  readonly pageTitle?: string | undefined;
  readonly section?: ResultPlotSection | undefined;
  readonly emptyTitle?: string | undefined;
  readonly emptyMessage?: string | undefined;
  readonly emptyAction?: View.Input<M, R> | undefined;
};

export function AnalysisPlotGallery<M, R = never>(
  h: Html.H<M>,
  options: AnalysisPlotGalleryOptions<M, R>,
) {
  if (options.plots.length === 0) {
    if (!options.emptyTitle && !options.emptyMessage) {
      return undefined;
    }
    return GalleryEmpty(h, {
      action: options.emptyAction,
      message: options.emptyMessage,
      title: options.emptyTitle,
    });
  }

  const groups = groupResultPlots([...options.plots]);

  return h.div.class("flex min-h-0 w-full flex-1 flex-col").children(
    options.pageTitle
      ? h.h2
          .class("mb-6 text-2xl font-semibold leading-8 tracking-[-0.02em] text-foreground")
          .children(options.pageTitle)
      : undefined,
    h.div.class("flex flex-col gap-10 pb-8").children(
      ...groups.map((group, groupIndex) =>
        h.section
          .key(`${group.title}-${groupIndex}`)
          .class("flex flex-col gap-3")
          .children(
            h.h3.class("text-sm font-semibold leading-5 text-foreground").children(group.title),
            h.div
              .class("grid gap-4")
              .style({
                gridTemplateColumns: `repeat(${resultGridColumns(group.plots.length, group.layout)}, minmax(0, 1fr))`,
              })
              .children(
                ...group.plots.map((plot, index) =>
                  h.figure
                    .key(`${plot.title}-${index}`)
                    .class("flex min-w-0 flex-col gap-1.5")
                    .children(
                      h.figcaption
                        .class("truncate text-xs font-medium leading-4 text-muted-foreground")
                        .children(group.labels[index] ?? ""),
                      plot.src
                        ? h.img
                            .attr("alt", plot.title)
                            .attr("decoding", "async")
                            .attr("loading", groupIndex === 0 ? "eager" : "lazy")
                            .attr("src", plot.src)
                            .class("h-auto w-full bg-white object-contain")
                        : h.div
                            .class(
                              "flex aspect-[7/6] items-center justify-center rounded-none border border-dashed text-sm text-muted-foreground",
                            )
                            .children("Plot image not found"),
                    ),
                ),
              ),
          ),
      ),
    ),
  );
}
