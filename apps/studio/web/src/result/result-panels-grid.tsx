import type { ResultPlot, ResultPlotSection } from "@lisca/analysis";
import type { JSX } from "solid-js";
import { For, Show } from "solid-js";

const EXPORT_PAGE_CLASS = "flex flex-col overflow-visible bg-white text-[#171717]";
const EXPORT_TITLE_CLASS =
  "border-b border-[#e5e5e5] px-4 py-3 text-2xl font-semibold text-[#171717]";
const EXPORT_PANEL_TITLE_CLASS = "truncate px-1 text-sm font-medium text-[#525252]";

function GalleryEmpty(props: { title?: string; message?: string; action?: JSX.Element }) {
  return (
    <div class="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <Show when={props.title}>
        <p class="font-medium text-foreground">{props.title}</p>
      </Show>
      <Show when={props.message}>
        <p class="max-w-sm text-sm leading-relaxed text-muted-foreground">{props.message}</p>
      </Show>
      {props.action}
    </div>
  );
}

export function ResultPlotGallery(props: {
  plots: ResultPlot[];
  exportMode?: boolean;
  pageTitle?: string;
  section?: ResultPlotSection;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: JSX.Element;
}) {
  return (
    <Show
      when={props.plots.length > 0}
      fallback={
        <Show when={!props.exportMode && (props.emptyTitle || props.emptyMessage)}>
          <GalleryEmpty
            action={props.emptyAction}
            message={props.emptyMessage}
            title={props.emptyTitle}
          />
        </Show>
      }
    >
      <div class={props.exportMode ? EXPORT_PAGE_CLASS : "flex min-h-0 w-full flex-1 flex-col"}>
        <Show when={props.pageTitle}>
          <h2
            class={
              props.exportMode
                ? EXPORT_TITLE_CLASS
                : "mb-6 text-2xl font-semibold leading-8 tracking-[-0.02em] text-foreground"
            }
          >
            {props.pageTitle}
          </h2>
        </Show>
        <div class={props.exportMode ? "flex flex-col gap-6 p-4" : "flex flex-col gap-8 pb-8"}>
          <For each={props.plots}>
            {(plot, index) => (
              <figure class="flex flex-col gap-2">
                <figcaption
                  class={
                    props.exportMode
                      ? EXPORT_PANEL_TITLE_CLASS
                      : "truncate text-[13px] font-medium leading-[18px] text-foreground"
                  }
                >
                  {plot.title}
                </figcaption>
                <Show
                  when={plot.src}
                  fallback={
                    <div class="flex min-h-[240px] items-center justify-center rounded-[18px] border border-dashed text-sm text-muted-foreground">
                      Plot image not found
                    </div>
                  }
                >
                  <img
                    alt={plot.title}
                    class={
                      props.exportMode
                        ? "w-full rounded-md border bg-white object-contain"
                        : "w-full bg-white object-contain"
                    }
                    decoding="async"
                    height="800"
                    loading={index() === 0 ? "eager" : "lazy"}
                    src={plot.src}
                    width="1200"
                  />
                </Show>
              </figure>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}
