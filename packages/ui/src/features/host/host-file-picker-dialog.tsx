import type { HostFilePickerMode, HostFilePickerOperations } from "@lisca/utils";
import { useHostFilePickerState } from "@lisca/ui-headless/host-file-picker-state";
import { favoriteLabel, recentLabel } from "@lisca/ui-headless/host-file-picker-state";
import IconArrowUpRegular from "phosphor-icons-solid/IconArrowUpRegular";
import IconClockCounterClockwiseRegular from "phosphor-icons-solid/IconClockCounterClockwiseRegular";
import IconEyeRegular from "phosphor-icons-solid/IconEyeRegular";
import IconEyeSlashRegular from "phosphor-icons-solid/IconEyeSlashRegular";
import IconHouseRegular from "phosphor-icons-solid/IconHouseRegular";
import IconPlusRegular from "phosphor-icons-solid/IconPlusRegular";
import IconStarFill from "phosphor-icons-solid/IconStarFill";
import IconXRegular from "phosphor-icons-solid/IconXRegular";
import { For, onCleanup, onMount, Show, createSignal } from "solid-js";

import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { cn } from "../../lib/utils";
import { DialogSurface } from "../../shell/modal/dialog-surface";
import { ModalScrim } from "../../shell/modal/modal-scrim";
import { HostFilePickerRow } from "./host-file-picker-row";

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

  /** Recent picks share the favorites chip row; newest first, a handful at most. */
  const recent = () => (props.onPickRecent ? (props.recentItems ?? []).slice(0, 5) : []);

  const [showNewFolder, setShowNewFolder] = createSignal(false);
  const [folderName, setFolderName] = createSignal("");
  const [creating, setCreating] = createSignal(false);
  const [folderError, setFolderError] = createSignal<string | null>(null);

  const openNewFolder = () => {
    setFolderName("");
    setFolderError(null);
    setShowNewFolder(true);
  };

  const cancelNewFolder = () => {
    setShowNewFolder(false);
    setFolderName("");
    setFolderError(null);
  };

  const confirmNewFolder = async () => {
    const name = folderName().trim();
    if (!name) {
      setFolderError("Folder name cannot be empty.");
      return;
    }
    setCreating(true);
    setFolderError(null);
    try {
      await picker.createDirectory(name);
      setShowNewFolder(false);
      setFolderName("");
    } catch (cause) {
      setFolderError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setCreating(false);
    }
  };

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
            <div class="flex flex-wrap items-center gap-2">
              <Button
                aria-label="Go up one directory"
                disabled={!picker.canGoUp() || picker.loading()}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={picker.goUp}
              >
                <IconArrowUpRegular class="size-4" />
              </Button>
              <Button
                aria-label="Go to home directory"
                disabled={picker.loading()}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => void picker.goHome()}
              >
                <IconHouseRegular class="size-4" />
              </Button>
              <Button
                aria-label="Create new folder"
                disabled={picker.loading() || !picker.list()?.path}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={openNewFolder}
              >
                <IconPlusRegular class="size-4" />
              </Button>
              <Button
                aria-label={picker.showHidden() ? "Hide hidden items" : "Show hidden items"}
                aria-pressed={picker.showHidden() ? "true" : "false"}
                class="ml-auto"
                size="icon-sm"
                title={picker.showHidden() ? "Hide hidden items" : "Show hidden items"}
                type="button"
                variant="ghost"
                onClick={picker.toggleShowHidden}
              >
                {picker.showHidden() ? (
                  <IconEyeRegular class="size-4" />
                ) : (
                  <IconEyeSlashRegular class="size-4" />
                )}
              </Button>
            </div>

            <Show when={recent().length > 0 || picker.favorites().length > 0}>
              <div class="flex flex-wrap gap-1.5">
                <Show when={recent().length > 0}>
                  <ul aria-label="Recent" class="contents">
                    <For each={recent()}>
                      {(item) => (
                        <li class="flex max-w-56 items-center rounded-md border border-border text-muted-foreground text-sm transition-colors hover:text-foreground">
                          <button
                            class="flex min-w-0 items-center gap-1.5 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title={`Open ${item.path}`}
                            type="button"
                            onClick={() => props.onPickRecent!(item.path)}
                          >
                            <IconClockCounterClockwiseRegular class="size-3.5 shrink-0" />
                            <span class="truncate">{item.label ?? recentLabel(item.path)}</span>
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
                <Show when={picker.favorites().length > 0}>
                  <ul aria-label="Favorite folders" class="contents">
                    <For each={picker.favorites()}>
                      {(path) => (
                        <li
                          class={cn(
                            "flex max-w-56 items-center rounded-md border text-sm transition-colors",
                            picker.list()?.path === path
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <button
                            class="flex min-w-0 items-center gap-1.5 py-1 pr-1 pl-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            disabled={picker.loading()}
                            title={`Go to ${path}`}
                            type="button"
                            onClick={() => picker.openFavorite(path)}
                          >
                            <IconStarFill class="size-3.5 shrink-0 text-primary" />
                            <span class="truncate">{favoriteLabel(path)}</span>
                          </button>
                          <button
                            aria-label={`Remove ${favoriteLabel(path)} from favorites`}
                            class="inline-flex shrink-0 items-center py-1 pr-1.5 pl-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            type="button"
                            onClick={() => picker.toggleFavorite(path)}
                          >
                            <IconXRegular class="size-3" />
                          </button>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
            </Show>

            <ScrollArea
              class="rounded-md border border-border bg-background/50"
              viewportClass="max-h-[min(360px,42vh)] min-h-[220px]"
            >
              <Show
                when={!picker.loading() && !picker.error() && picker.entries().length > 0}
                fallback={
                  <Show
                    when={picker.loading()}
                    fallback={
                      <Show
                        when={picker.error()}
                        fallback={
                          <div class="flex h-[220px] items-center justify-center text-muted-foreground text-sm">
                            {picker.hiddenCount() > 0 ? "Only hidden items here." : "No entries."}
                          </div>
                        }
                      >
                        <div class="p-3 text-destructive text-sm">{picker.error()}</div>
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
                  <For each={picker.entries()}>
                    {(entry) => (
                      <HostFilePickerRow
                        entry={entry}
                        muted={
                          !entry.isDirectory && !picker.dirMode() && !picker.fileMatchesMode(entry)
                        }
                        favorite={picker.isFavorite(entry.path)}
                        selected={picker.selectedFile()?.path === entry.path && !entry.isDirectory}
                        onClick={picker.handleRowClick}
                        onDoubleClick={picker.handleRowDoubleClick}
                        onToggleFavorite={(folder) => picker.toggleFavorite(folder.path)}
                      />
                    )}
                  </For>
                </ul>
              </Show>
            </ScrollArea>
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

      <Show when={showNewFolder()}>
        <ModalScrim
          zIndex="z-50"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !creating()) cancelNewFolder();
          }}
        >
          <DialogSurface aria-labelledby="new-folder-title" maxWidth="sm">
            <div class="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <h2
                  class="font-semibold text-foreground text-lg leading-none"
                  id="new-folder-title"
                >
                  New folder
                </h2>
                <Show when={picker.locationLabel()}>
                  {(locationLabel) => (
                    <p class="mt-1 truncate text-muted-foreground text-sm" title={locationLabel()}>
                      {locationLabel()}
                    </p>
                  )}
                </Show>
              </div>
              <Button
                aria-label="Close new folder dialog"
                class="shrink-0"
                disabled={creating()}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={cancelNewFolder}
              >
                <IconXRegular class="size-4" />
              </Button>
            </div>

            <form
              class="flex flex-col gap-4 px-5 py-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (!creating()) void confirmNewFolder();
              }}
            >
              <Field class="gap-2">
                <FieldLabel for="new-folder-name">Folder name</FieldLabel>
                <Input
                  autocomplete="off"
                  autofocus
                  disabled={creating()}
                  id="new-folder-name"
                  name="new-folder-name"
                  placeholder="e.g. experiment-01…"
                  type="text"
                  value={folderName()}
                  onInput={(event) => {
                    setFolderName(event.currentTarget.value);
                    setFolderError(null);
                  }}
                />
                <Show when={folderError()}>
                  <p class="text-destructive text-sm" role="alert">
                    {folderError()}
                  </p>
                </Show>
              </Field>
            </form>

            <div class="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button
                disabled={creating()}
                type="button"
                variant="outline"
                onClick={cancelNewFolder}
              >
                Cancel
              </Button>
              <Button
                disabled={creating() || !folderName().trim()}
                type="button"
                onClick={() => void confirmNewFolder()}
              >
                {creating() ? "Creating…" : "Create"}
              </Button>
            </div>
          </DialogSurface>
        </ModalScrim>
      </Show>
    </Show>
  );
}
