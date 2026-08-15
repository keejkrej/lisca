import type { ResultPlot, ResultPlotSection } from "@lisca/analysis";
import { For, Show } from "solid-js";

const EXPORT_PAGE_CLASS = "flex flex-col overflow-visible bg-white text-[#171717]";
const EXPORT_TITLE_CLASS =
  "border-b border-[#e5e5e5] px-4 py-3 text-2xl font-semibold text-[#171717]";
const EXPORT_PANEL_TITLE_CLASS = "truncate px-1 text-xl font-semibold text-[#737373]";

export function ResultPlotGallery(props: {
  plots: ResultPlot[];
  exportMode?: boolean;
  pageTitle?: string;
  section?: ResultPlotSection;
  emptyMessage?: string;
}) {
  if (props.plots.length === 0) {
    if (props.exportMode || !props.emptyMessage) return null;
    return (
      <div class="flex h-full min-h-0 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        {props.emptyMessage}
      </div>
    );
  }

  return (
    <div
      class={props.exportMode ? EXPORT_PAGE_CLASS : "flex h-full min-h-0 flex-col overflow-y-auto"}
    >
      <Show when={props.pageTitle}>
        <h2
          class={
            props.exportMode
              ? EXPORT_TITLE_CLASS
              : "border-b px-4 py-3 text-2xl font-semibold text-foreground"
          }
        >
          {props.pageTitle}
        </h2>
      </Show>
      <div class="flex flex-col gap-8 p-4">
        <For each={props.plots}>
          {(plot) => (
            <figure class="flex flex-col gap-2">
              <figcaption
                class={
                  props.exportMode
                    ? EXPORT_PANEL_TITLE_CLASS
                    : "truncate px-1 text-xl font-semibold text-muted-foreground"
                }
              >
                {plot.title}
              </figcaption>
              <Show
                when={plot.src}
                fallback={
                  <div class="flex min-h-[240px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                    Missing plot image
                  </div>
                }
              >
                <img
                  alt={plot.title}
                  class="w-full rounded-md border bg-white object-contain"
                  src={plot.src}
                />
              </Show>
            </figure>
          )}
        </For>
      </div>
    </div>
  );
}

