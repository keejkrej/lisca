import {
  groupResultPlots,
  resultGridColumns,
  type ResultPlot,
  type ResultPlotSection,
} from "@lisca/analysis";
import type { JSX } from "solid-js";
import { For, Show } from "solid-js";

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
        <Show when={props.emptyTitle || props.emptyMessage}>
          <GalleryEmpty
            action={props.emptyAction}
            message={props.emptyMessage}
            title={props.emptyTitle}
          />
        </Show>
      }
    >
      <div class="flex min-h-0 w-full flex-1 flex-col">
        <Show when={props.pageTitle}>
          <h2 class="mb-6 text-2xl font-semibold leading-8 tracking-[-0.02em] text-foreground">
            {props.pageTitle}
          </h2>
        </Show>
        <div class="flex flex-col gap-10 pb-8">
          <For each={groupResultPlots(props.plots)}>
            {(group, groupIndex) => (
              <section class="flex flex-col gap-3">
                <h3 class="text-sm font-semibold leading-5 text-foreground">{group.title}</h3>
                <div
                  class="grid gap-4"
                  style={{
                    "grid-template-columns": `repeat(${resultGridColumns(group.plots.length)}, minmax(0, 1fr))`,
                  }}
                >
                  <For each={group.plots}>
                    {(plot, index) => (
                      <figure class="flex min-w-0 flex-col gap-1.5">
                        <figcaption class="truncate text-xs font-medium leading-4 text-muted-foreground">
                          {group.labels[index()]}
                        </figcaption>
                        <Show
                          when={plot.src}
                          fallback={
                            <div class="flex aspect-[7/6] items-center justify-center rounded-none border border-dashed text-sm text-muted-foreground">
                              Plot image not found
                            </div>
                          }
                        >
                          <img
                            alt={plot.title}
                            class="h-auto w-full bg-white object-contain"
                            decoding="async"
                            loading={groupIndex() === 0 ? "eager" : "lazy"}
                            src={plot.src}
                          />
                        </Show>
                      </figure>
                    )}
                  </For>
                </div>
              </section>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}
