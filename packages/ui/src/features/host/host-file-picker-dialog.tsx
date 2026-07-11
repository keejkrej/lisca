import type { HostFilePickerMode } from "@lisca/ui-headless/host";
import { useHostFilePickerState } from "@lisca/ui-headless/host-file-picker-state";
import IconArrowUpRegular from "phosphor-icons-solid/IconArrowUpRegular";
import IconHouseRegular from "phosphor-icons-solid/IconHouseRegular";
import IconPlusRegular from "phosphor-icons-solid/IconPlusRegular";
import IconXRegular from "phosphor-icons-solid/IconXRegular";
import { For, onCleanup, onMount, Show, createSignal } from "solid-js";

import { Button } from "../../components/ui/button";
import { Field, FieldLabel } from "../../components/ui/field";
import { Input } from "../../components/ui/input";
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
                <h2 class="font-semibold text-foreground text-lg leading-none" id="new-folder-title">
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
                  placeholder="Folder name"
                  type="text"
                  value={folderName()}
                  onInput={(event) => {
                    setFolderName(event.currentTarget.value);
                    setFolderError(null);
                  }}
                />
                <Show when={folderError()}>
                  <p class="text-destructive text-sm">{folderError()}</p>
                </Show>
              </Field>
            </form>

            <div class="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button disabled={creating()} type="button" variant="outline" onClick={cancelNewFolder}>
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