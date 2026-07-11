import type { HostFilePickerMode } from "@lisca/ui-headless/host";
import { useHostFilePickerState } from "@lisca/ui-headless/host-file-picker-state";
import IconXRegular from "phosphor-icons-solid/IconXRegular";
import { For, onCleanup, onMount, Show } from "solid-js";

import { Button } from "../../components/ui/button";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";
import { HostFilePickerRow } from "./host-file-picker-row";
import type { HostFilePickerOperations } from "./host-operations";

export type HostFilePickerRecentItem = {
  path: string;
  label?: string;
};

export type HostFilePickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hostPort: HostFilePickerOperations;
  mode: HostFilePickerMode;
  title: string;
  description?: string;
  recentItems?: readonly HostFilePickerRecentItem[];
  onPickRecent?: (path: string) => void;
  onPickDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
};

export function HostFilePickerDialog(props: HostFilePickerDialogProps) {
  const picker = useHostFilePickerState(() => ({
    open: props.open,
    mode: props.mode,
    hostPort: props.hostPort,
    onOpenChange: props.onOpenChange,
    onPickDirectory: props.onPickDirectory,
    onPickFile: props.onPickFile,
  }));

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && props.open) props.onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    onCleanup(() => window.removeEventListener("keydown", onKeyDown));
  });

  return (
    <Show when={props.open}>
      <ModalScrim
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) props.onOpenChange(false);
        }}
      >
        <DialogSurface aria-labelledby="host-file-picker-title" maxWidth="2xl">
          <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div class="min-w-0">
              <h2
                class="font-semibold text-foreground text-lg leading-none"
                id="host-file-picker-title"
              >
                {props.title}
              </h2>
              <Show when={picker.locationLabel()}>
                {(locationLabel) => (
                  <p class="mt-1 truncate text-muted-foreground text-sm" title={locationLabel()}>
                    {locationLabel()}
                  </p>
                )}
              </Show>
              <Show when={props.description}>
                <p class="mt-1 text-muted-foreground text-sm">{props.description}</p>
              </Show>
            </div>
            <Button
              aria-label="Close file picker"
              class="shrink-0"
              size="icon-sm"
              type="button"
              variant="ghost"
              onClick={() => props.onOpenChange(false)}
            >
              <IconXRegular class="size-4" />
            </Button>
          </div>

          <div class="flex flex-col gap-3 px-5 py-4">
            <Show when={props.recentItems && props.recentItems.length > 0 && props.onPickRecent}>
              <div class="space-y-2">
                <p class="font-medium text-foreground text-sm">Recent</p>
                <ul class="max-h-32 overflow-auto rounded-md border border-border divide-y divide-border/60">
                  <For each={props.recentItems}>
                    {(item) => (
                      <li>
                        <button
                          class="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30"
                          type="button"
                          onClick={() => props.onPickRecent!(item.path)}
                        >
                          <Show when={item.label}>
                            <span class="font-medium text-foreground">{item.label}</span>
                          </Show>
                          <span class="truncate text-muted-foreground" title={item.path}>
                            {item.path}
                          </span>
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>

            <div class="flex flex-wrap items-center gap-2">
              <Button
                disabled={!picker.canGoUp() || picker.loading()}
                size="sm"
                type="button"
                variant="outline"
                onClick={picker.goUp}
              >
                Up
              </Button>
              <Button
                aria-label="Go to home directory"
                disabled={picker.loading()}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => void picker.goHome()}
              >
                Home
              </Button>
            </div>

            <div class="max-h-[min(360px,42vh)] min-h-[220px] overflow-auto rounded-md border border-border bg-background/50">
              <Show
                when={!picker.loading() && !picker.error() && (picker.list()?.entries ?? []).length > 0}
                fallback={
                  <Show
                    when={picker.loading()}
                    fallback={
                      <Show
                        when={picker.error()}
                        fallback={
                          <div class="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
                            No entries.
                          </div>
                        }
                      >
                        <div class="p-3 text-destructive-foreground text-sm">{picker.error()}</div>
                      </Show>
                    }
                  >
                    <div class="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
                      Loading…
                    </div>
                  </Show>
                }
              >
                <ul class="divide-y divide-border/60">
                  <For each={picker.list()?.entries ?? []}>
                    {(entry) => (
                      <HostFilePickerRow
                        entry={entry}
                        muted={
                          !entry.isDirectory &&
                          !picker.dirMode() &&
                          !picker.fileMatchesMode(entry)
                        }
                        selected={
                          picker.selectedFile()?.path === entry.path && !entry.isDirectory
                        }
                        onClick={picker.handleRowClick}
                        onDoubleClick={picker.handleRowDoubleClick}
                      />
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>
              Cancel
            </Button>
            <Show
              when={picker.dirMode()}
              fallback={
                <Button
                  disabled={
                    !picker.selectedFile() ||
                    picker.selectedFile()!.isDirectory ||
                    !picker.fileMatchesMode(picker.selectedFile()!) ||
                    picker.loading()
                  }
                  type="button"
                  onClick={picker.confirmFile}
                >
                  Select file
                </Button>
              }
            >
              <Button
                disabled={!picker.list()?.path || picker.loading()}
                type="button"
                onClick={picker.confirmDirectory}
              >
                Select folder
              </Button>
            </Show>
          </div>
        </DialogSurface>
      </ModalScrim>
    </Show>
  );
}