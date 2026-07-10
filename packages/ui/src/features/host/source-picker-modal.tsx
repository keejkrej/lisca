import type { AlignerSource } from "@lisca/contracts";
import { X } from "lucide-solid";
import { For, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";

export type SourcePickerRecentItem = {
  source: AlignerSource;
  label?: string;
};

function formatSourcePath(source: AlignerSource): string {
  return source.path;
}

export type SourcePickerModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void | Promise<void>;
  onOpenNd2: () => void | Promise<void>;
  onOpenCzi: () => void | Promise<void>;
  recentSources?: readonly SourcePickerRecentItem[];
  onPickRecentSource?: (source: AlignerSource) => void;
};

const optionClass =
  "group flex min-h-24 w-full items-center justify-center rounded-lg border border-border bg-muted/20 px-4 py-5 text-center transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SourcePickerModal(props: SourcePickerModalProps) {
  const handleSelect = async (fn: () => void | Promise<void>) => {
    props.onClose();
    await fn();
  };

  return (
    <Show when={props.open}>
      <ModalScrim
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) props.onClose();
        }}
      >
        <DialogSurface aria-labelledby="open-source-title" maxWidth="lg">
          <div class="px-5 pb-3 pt-5">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <h2 class="font-semibold text-foreground text-lg" id="open-source-title">
                  Open Data
                </h2>
                <p class="text-muted-foreground text-sm">Choose a source format.</p>
              </div>

              <Button
                aria-label="Close open data modal"
                class="shrink-0"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={props.onClose}
              >
                <X class="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <div class="space-y-4 px-5 pb-5">
            <Show when={props.recentSources && props.recentSources.length > 0 && props.onPickRecentSource}>
              <div class="space-y-2">
                <p class="font-medium text-foreground text-sm">Recent sources</p>
                <ul class="max-h-32 overflow-auto rounded-md border border-border divide-y divide-border/60">
                  <For each={props.recentSources}>
                    {(item) => (
                      <li>
                        <button
                          class="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30"
                          type="button"
                          onClick={() => {
                            props.onPickRecentSource!(item.source);
                            props.onClose();
                          }}
                        >
                          <Show
                            when={item.label}
                            fallback={
                              <span class="font-medium text-foreground capitalize">
                                {item.source.kind}
                              </span>
                            }
                          >
                            <span class="font-medium text-foreground">{item.label}</span>
                          </Show>
                          <span
                            class="truncate text-muted-foreground"
                            title={formatSourcePath(item.source)}
                          >
                            {formatSourcePath(item.source)}
                          </span>
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                class={optionClass}
                type="button"
                onClick={() => void handleSelect(props.onOpenFolder)}
              >
                <span class="font-medium text-foreground text-lg group-hover:text-primary">
                  Folder
                </span>
              </button>
              <button
                class={optionClass}
                type="button"
                onClick={() => void handleSelect(props.onOpenNd2)}
              >
                <span class="font-medium text-foreground text-lg group-hover:text-primary">
                  ND2
                </span>
              </button>
              <button
                class={optionClass}
                type="button"
                onClick={() => void handleSelect(props.onOpenCzi)}
              >
                <span class="font-medium text-foreground text-lg group-hover:text-primary">
                  CZI
                </span>
              </button>
            </div>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}