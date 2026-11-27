import { Command, Component, Subscription, UiSchema, View } from "@effect/ui";
import { Html } from "@effect/ui/html";
import type { HostDrive, HostFsEntry, HostListDirectoryResult } from "@lisca/contracts";
import { Button } from "@lisca/ui/button";
import { cn } from "@lisca/ui/cn";
import { Field, FieldLabel } from "@lisca/ui/field";
import { Icon } from "@lisca/ui/icons";
import { Input } from "@lisca/ui/input";
import { ModalScrim } from "@lisca/ui/patterns";
import { ScrollArea } from "@lisca/ui/scroll-area";
import { Select } from "@lisca/ui/select";
import {
  canGoUpFromList,
  driveForPath,
  favoriteLabel,
  fileMatchesMode,
  HOST_FILE_PICKER_FAVORITES_STORAGE_KEY,
  hostFilePickerLocationLabel,
  isDirectoryMode,
  nativeFilePickerLabel,
  nativePickerExtensions,
  normalizeFavoritePaths,
  parentPathForGoUp,
  recentLabel,
  toggleFavoritePath,
  visibleEntries,
} from "@lisca/ui-headless/host-file-picker-state";
import type { HostFilePickerMode } from "@lisca/utils";
import { Effect, Schema, Stream } from "effect";

import { HostFilePickerPort } from "./folder-source-parse-modal";
import { HostFilePickerRow } from "./host-file-picker-row";

export const HostFilePickerRecentItemSchema = Schema.Struct({
  path: Schema.String,
  label: Schema.optional(Schema.String),
});
export type HostFilePickerRecentItem = typeof HostFilePickerRecentItemSchema.Type;

const HostFilePickerModeSchema = Schema.Literals([
  "workspace",
  "folder",
  "nd2_file",
  "czi_file",
  "assay_json_file",
]);

const HostFsEntrySchema = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  isDirectory: Schema.Boolean,
});

const HostDriveSchema = Schema.Struct({
  letter: Schema.String,
  path: Schema.String,
});

const HostListDirectoryResultSchema = Schema.Struct({
  path: Schema.NullOr(Schema.String),
  parent: Schema.NullOr(Schema.String),
  entries: Schema.Array(HostFsEntrySchema),
});

function formatHostError(cause: unknown): string {
  return cause instanceof Error && cause.message.includes("Could not parse JSON")
    ? "Could not reach the API server. Ensure the Rust backend is running."
    : cause instanceof Error
      ? cause.message
      : String(cause);
}

function readStoredFavorites(): readonly string[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(HOST_FILE_PICKER_FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? normalizeFavoritePaths(parsed) : [];
  } catch {
    return [];
  }
}

function writeStoredFavorites(paths: readonly string[]): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(HOST_FILE_PICKER_FAVORITES_STORAGE_KEY, JSON.stringify(paths));
    }
  } catch {
    /* ignore */
  }
}

const PickerMessage = UiSchema.TaggedEnum({
  Opened: {},
  LoadDirectory: { path: Schema.NullOr(Schema.String) },
  LoadedDirectory: { list: HostListDirectoryResultSchema },
  LoadFailed: { error: Schema.String },
  LoadedHostCapabilities: {
    windowsHost: Schema.Boolean,
    drives: Schema.Array(HostDriveSchema),
    canOpenNative: Schema.Boolean,
  },
  SetDriveSelectOpen: { open: Schema.Boolean },
  SelectDrive: { path: Schema.String },
  ToggleShowHidden: {},
  ToggleFavorite: { path: Schema.String },
  RowClicked: { entry: HostFsEntrySchema },
  RowDoubleClicked: { entry: HostFsEntrySchema },
  ConfirmDirectory: {},
  ConfirmFile: {},
  GoUp: {},
  GoHome: {},
  OpenNative: {},
  NativeFinished: { picked: Schema.NullOr(Schema.String), error: Schema.NullOr(Schema.String) },
  OpenNewFolder: {},
  CancelNewFolder: {},
  TypedFolderName: { value: Schema.String },
  ConfirmNewFolder: {},
  CreateFolderFinished: { error: Schema.NullOr(Schema.String) },
  CloseRequested: {},
  PickRecent: { path: Schema.String },
  RemoveRecent: { path: Schema.String },
});

export const HostFilePickerEvents = UiSchema.TaggedEnum({
  OpenChanged: { open: Schema.Boolean },
  PickedDirectory: { path: Schema.String },
  PickedFile: { path: Schema.String },
  PickedRecent: { path: Schema.String },
  RemovedRecent: { path: Schema.String },
});

function toSchemaList(list: HostListDirectoryResult) {
  return {
    path: list.path,
    parent: list.parent ?? null,
    entries: list.entries.map((entry) => ({
      name: entry.name,
      path: entry.path,
      isDirectory: entry.isDirectory,
    })),
  };
}

const LoadHomeDirectoryCmd = Command.make("LiscaHostFilePickerLoadHome", { args: {} }, () =>
  Effect.gen(function* () {
    const hostPort = yield* HostFilePickerPort;
    if (!hostPort) {
      return PickerMessage.LoadFailed({ error: "Host file picker is unavailable." });
    }
    return yield* Effect.tryPromise({
      try: async () => {
        const home = await hostPort.userHomeDirectory();
        return hostPort.listDirectory(home);
      },
      catch: formatHostError,
    }).pipe(
      Effect.map((list) => PickerMessage.LoadedDirectory({ list: toSchemaList(list) })),
      Effect.catch((error) => Effect.succeed(PickerMessage.LoadFailed({ error }))),
    );
  }),
);

const LoadDirectoryCmd = Command.make(
  "LiscaHostFilePickerLoadDir",
  { args: { path: Schema.NullOr(Schema.String) } },
  ({ path }) =>
    Effect.gen(function* () {
      const hostPort = yield* HostFilePickerPort;
      if (!hostPort) {
        return PickerMessage.LoadFailed({ error: "Host file picker is unavailable." });
      }
      return yield* Effect.tryPromise({
        try: () => hostPort.listDirectory(path),
        catch: formatHostError,
      }).pipe(
        Effect.map((list) => PickerMessage.LoadedDirectory({ list: toSchemaList(list) })),
        Effect.catch((error) => Effect.succeed(PickerMessage.LoadFailed({ error }))),
      );
    }),
);

const LoadHostCapabilitiesCmd = Command.make("LiscaHostFilePickerLoadCaps", { args: {} }, () =>
  Effect.gen(function* () {
    const hostPort = yield* HostFilePickerPort;
    if (!hostPort) return Component.noop;
    const canOpenNative = Boolean(hostPort.openNativePicker);
    return yield* Effect.tryPromise({
      try: () => hostPort.windowsDrives(),
      catch: () => ({ windows: false, drives: [] as HostDrive[] }),
    }).pipe(
      Effect.map((result) =>
        PickerMessage.LoadedHostCapabilities({
          windowsHost: result.windows,
          drives: result.windows
            ? result.drives.map((drive) => ({ letter: drive.letter, path: drive.path }))
            : [],
          canOpenNative,
        }),
      ),
      Effect.catch(() =>
        Effect.succeed(
          PickerMessage.LoadedHostCapabilities({
            windowsHost: false,
            drives: [],
            canOpenNative,
          }),
        ),
      ),
    );
  }),
);

const OpenNativeCmd = Command.make(
  "LiscaHostFilePickerOpenNative",
  { args: { mode: HostFilePickerModeSchema, directoryPath: Schema.NullOr(Schema.String) } },
  ({ mode, directoryPath }) =>
    Effect.gen(function* () {
      const hostPort = yield* HostFilePickerPort;
      if (!hostPort?.openNativePicker) {
        return PickerMessage.NativeFinished({ picked: null, error: null });
      }
      return yield* Effect.tryPromise({
        try: () =>
          hostPort.openNativePicker!({
            directory: isDirectoryMode(mode),
            directoryPath,
            extensions: nativePickerExtensions(mode),
          }),
        catch: (cause) => (cause instanceof Error ? cause.message : String(cause)),
      }).pipe(
        Effect.map((picked) =>
          PickerMessage.NativeFinished({ picked: picked ?? null, error: null }),
        ),
        Effect.catch((error) =>
          Effect.succeed(PickerMessage.NativeFinished({ picked: null, error })),
        ),
      );
    }),
);

const CreateDirectoryCmd = Command.make(
  "LiscaHostFilePickerCreateDir",
  { args: { parent: Schema.String, name: Schema.String } },
  ({ parent, name }) =>
    Effect.gen(function* () {
      const hostPort = yield* HostFilePickerPort;
      if (!hostPort?.createDirectory) {
        return PickerMessage.CreateFolderFinished({
          error: "Creating folders is not supported on this host.",
        });
      }
      return yield* Effect.tryPromise({
        try: () => hostPort.createDirectory(parent, name),
        catch: formatHostError,
      }).pipe(
        Effect.as(PickerMessage.CreateFolderFinished({ error: null })),
        Effect.catch((error) => Effect.succeed(PickerMessage.CreateFolderFinished({ error }))),
      );
    }),
);

const HostFilePickerComponent = Html.component({
  name: "HostFilePickerDialog",
  props: Schema.Struct({
    open: Schema.Boolean,
    mode: HostFilePickerModeSchema,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    recentItems: Schema.optional(Schema.Array(HostFilePickerRecentItemSchema)),
    hasPickRecent: Schema.optional(Schema.Boolean),
    hasRemoveRecent: Schema.optional(Schema.Boolean),
  }),
  model: Schema.Struct({
    list: Schema.NullOr(HostListDirectoryResultSchema),
    windowsHost: Schema.Boolean,
    drives: Schema.Array(HostDriveSchema),
    canOpenNative: Schema.Boolean,
    loading: Schema.Boolean,
    error: Schema.NullOr(Schema.String),
    selectedFile: Schema.NullOr(HostFsEntrySchema),
    showHidden: Schema.Boolean,
    favorites: Schema.Array(Schema.String),
    pickingNative: Schema.Boolean,
    driveSelectOpen: Schema.Boolean,
    showNewFolder: Schema.Boolean,
    folderName: Schema.String,
    creating: Schema.Boolean,
    folderError: Schema.NullOr(Schema.String),
  }),
  message: PickerMessage,
  events: HostFilePickerEvents,
}).make({
  init: ($) => ({
    list: null,
    windowsHost: false,
    drives: [],
    canOpenNative: false,
    loading: $.props.open,
    error: null,
    selectedFile: null,
    showHidden: false,
    favorites: [...readStoredFavorites()],
    pickingNative: false,
    driveSelectOpen: false,
    showNewFolder: false,
    folderName: "",
    creating: false,
    folderError: null,
  }),
  update: {
    Opened: ($) =>
      $.evolve({
        list: null,
        selectedFile: null,
        error: null,
        showHidden: false,
        favorites: [...readStoredFavorites()],
        windowsHost: false,
        drives: [],
        loading: true,
        showNewFolder: false,
        folderName: "",
        folderError: null,
        creating: false,
      }).run(LoadHostCapabilitiesCmd.make(), LoadHomeDirectoryCmd.make()),
    LoadDirectory: ($, { path }) =>
      $.evolve({ loading: true, error: null, selectedFile: null }).run(
        LoadDirectoryCmd.make({ path }),
      ),
    LoadedDirectory: ($, { list }) =>
      $.evolve({ list, loading: false, error: null, selectedFile: null }),
    LoadFailed: ($, { error }) => $.evolve({ list: null, loading: false, error }),
    LoadedHostCapabilities: ($, { windowsHost, drives, canOpenNative }) =>
      $.evolve({ windowsHost, drives, canOpenNative }),
    SetDriveSelectOpen: ($, { open }) => $.evolve({ driveSelectOpen: open }),
    SelectDrive: ($, { path }) =>
      $.evolve({ driveSelectOpen: false, loading: true, error: null, selectedFile: null }).run(
        LoadDirectoryCmd.make({ path }),
      ),
    ToggleShowHidden: ($) => $.evolve({ showHidden: (current) => !current }),
    ToggleFavorite: ($, { path }) => {
      const next = [...toggleFavoritePath(readStoredFavorites(), path)];
      writeStoredFavorites(next);
      return $.evolve({ favorites: next });
    },
    RowClicked: ($, { entry }) => {
      if (entry.isDirectory) {
        return $.evolve({ loading: true, error: null, selectedFile: null }).run(
          LoadDirectoryCmd.make({ path: entry.path }),
        );
      }
      if (isDirectoryMode($.props.mode)) {
        return $.model;
      }
      if (!fileMatchesMode($.props.mode, entry)) {
        return $.model;
      }
      return $.evolve({ selectedFile: entry });
    },
    RowDoubleClicked: ($, { entry }) => {
      if (entry.isDirectory) {
        return $.evolve({ loading: true, error: null, selectedFile: null }).run(
          LoadDirectoryCmd.make({ path: entry.path }),
        );
      }
      if (!isDirectoryMode($.props.mode) && fileMatchesMode($.props.mode, entry)) {
        return $.emit(
          HostFilePickerEvents.PickedFile({ path: entry.path }),
          HostFilePickerEvents.OpenChanged({ open: false }),
        );
      }
      return $.model;
    },
    ConfirmDirectory: ($) => {
      const path = $.model.list?.path;
      if (!path) return $.model;
      return $.emit(
        HostFilePickerEvents.PickedDirectory({ path }),
        HostFilePickerEvents.OpenChanged({ open: false }),
      );
    },
    ConfirmFile: ($) => {
      const selected = $.model.selectedFile;
      if (!selected || selected.isDirectory || !fileMatchesMode($.props.mode, selected)) {
        return $.model;
      }
      return $.emit(
        HostFilePickerEvents.PickedFile({ path: selected.path }),
        HostFilePickerEvents.OpenChanged({ open: false }),
      );
    },
    GoUp: ($) => {
      const parent = parentPathForGoUp($.model.list?.parent);
      if ($.model.list?.parent == null) return $.model;
      return $.evolve({ loading: true, error: null, selectedFile: null }).run(
        LoadDirectoryCmd.make({ path: parent }),
      );
    },
    GoHome: ($) =>
      $.evolve({ loading: true, error: null, selectedFile: null }).run(LoadHomeDirectoryCmd.make()),
    OpenNative: ($) =>
      $.evolve({ pickingNative: true, error: null }).run(
        OpenNativeCmd.make({
          mode: $.props.mode,
          directoryPath: $.model.list?.path ?? null,
        }),
      ),
    NativeFinished: ($, { picked, error }) => {
      if (error) return $.evolve({ pickingNative: false, error });
      if (!picked) return $.evolve({ pickingNative: false });
      const event = isDirectoryMode($.props.mode)
        ? HostFilePickerEvents.PickedDirectory({ path: picked })
        : HostFilePickerEvents.PickedFile({ path: picked });
      return $.evolve({ pickingNative: false }).emit(
        event,
        HostFilePickerEvents.OpenChanged({ open: false }),
      );
    },
    OpenNewFolder: ($) => $.evolve({ showNewFolder: true, folderName: "", folderError: null }),
    CancelNewFolder: ($) => $.evolve({ showNewFolder: false, folderName: "", folderError: null }),
    TypedFolderName: ($, { value }) => $.evolve({ folderName: value, folderError: null }),
    ConfirmNewFolder: ($) => {
      const name = $.model.folderName.trim();
      const parent = $.model.list?.path;
      if (!name) {
        return $.evolve({ folderError: "Folder name cannot be empty." });
      }
      if (!parent) return $.model;
      return $.evolve({ creating: true, folderError: null }).run(
        CreateDirectoryCmd.make({ parent, name }),
      );
    },
    CreateFolderFinished: ($, { error }) => {
      if (error) {
        return $.evolve({ creating: false, folderError: error });
      }
      return $.evolve({
        creating: false,
        showNewFolder: false,
        folderName: "",
        folderError: null,
        loading: true,
      }).run(LoadDirectoryCmd.make({ path: $.model.list?.path ?? null }));
    },
    CloseRequested: ($) => $.emit(HostFilePickerEvents.OpenChanged({ open: false })),
    PickRecent: ($, { path }) => $.emit(HostFilePickerEvents.PickedRecent({ path })),
    RemoveRecent: ($, { path }) => $.emit(HostFilePickerEvents.RemovedRecent({ path })),
  },
  subscriptions: ({ props }) => [
    props.open &&
      Subscription.make("host-picker-open", props.open, () => Stream.make(PickerMessage.Opened())),
  ],
  view: (h, model) => {
    if (!h.props.open) {
      return View.text("");
    }

    const dirMode = isDirectoryMode(h.props.mode);
    const allEntries: readonly HostFsEntry[] = model.list?.entries ?? [];
    const entries = visibleEntries(allEntries, model.showHidden);
    const hiddenCount = allEntries.length - entries.length;
    const listForHelpers: HostListDirectoryResult | null = model.list
      ? { path: model.list.path, parent: model.list.parent, entries: [...model.list.entries] }
      : null;
    const canGoUp = canGoUpFromList(listForHelpers);
    const locationLabel = hostFilePickerLocationLabel(listForHelpers);
    const currentDrive = driveForPath(model.list?.path, model.drives);
    const driveLetter = (path: string) =>
      model.drives.find((drive) => drive.path === path)?.letter ?? path;

    const recent = h.props.hasPickRecent ? (h.props.recentItems ?? []).slice(0, 5) : [];
    const nativeLabel = model.canOpenNative
      ? nativeFilePickerLabel(
          typeof navigator === "undefined" ? "" : navigator.platform,
          model.windowsHost,
        )
      : null;

    return h.div.class("contents").children(
      ModalScrim(h, {
        key: "host-file-picker",
        maxWidth: "2xl",
        ariaLabelledby: "host-file-picker-title",
        onDismiss: () => PickerMessage.CloseRequested(),
        children: [
          h.div
            .class("flex items-start justify-between gap-4 border-b border-border px-5 py-4")
            .children(
              h.div
                .class("min-w-0")
                .children(
                  h.h2
                    .attr("id", "host-file-picker-title")
                    .class("font-semibold text-foreground text-lg leading-none")
                    .children(h.props.title),
                  locationLabel
                    ? h.p
                        .attr("title", locationLabel)
                        .class("mt-1 truncate text-muted-foreground text-sm")
                        .children(locationLabel)
                    : undefined,
                  h.props.description
                    ? h.p.class("mt-1 text-muted-foreground text-sm").children(h.props.description)
                    : undefined,
                ),
              Button(h, {
                ariaLabel: "Close file picker",
                class: "shrink-0",
                size: "icon-sm",
                type: "button",
                variant: "ghost",
                onPress: PickerMessage.CloseRequested(),
              }).children(Icon(h, "x", { class: "size-4" })),
            ),
          h.div.class("flex flex-col gap-3 px-5 py-4").children(
            h.div.class("flex flex-wrap items-center gap-2").children(
              Button(h, {
                ariaLabel: "Go up one directory",
                disabled: !canGoUp || model.loading,
                size: "icon-sm",
                type: "button",
                variant: "ghost",
                onPress: PickerMessage.GoUp(),
              }).children(Icon(h, "arrow-up", { class: "size-4" })),
              Button(h, {
                ariaLabel: "Go to home directory",
                disabled: model.loading,
                size: "icon-sm",
                type: "button",
                variant: "ghost",
                onPress: PickerMessage.GoHome(),
              }).children(Icon(h, "house", { class: "size-4" })),
              Button(h, {
                ariaLabel: "Create new folder",
                disabled: model.loading || !model.list?.path,
                size: "icon-sm",
                type: "button",
                variant: "ghost",
                onPress: PickerMessage.OpenNewFolder(),
              }).children(Icon(h, "plus", { class: "size-4" })),
              nativeLabel
                ? Button(h, {
                    ariaLabel: nativeLabel,
                    disabled: model.pickingNative,
                    size: "icon-sm",
                    title: nativeLabel,
                    type: "button",
                    variant: "ghost",
                    onPress: PickerMessage.OpenNative(),
                  }).children(Icon(h, "folder-open", { class: "size-4" }))
                : undefined,
              model.drives.length > 0
                ? Select(h, {
                    key: "drive-select",
                    ariaLabel: "Drive",
                    class: "w-auto",
                    triggerClass: "w-auto",
                    contentClass: "min-w-24",
                    triggerSize: "sm",
                    sameWidth: false,
                    placement: "bottom-start",
                    open: model.driveSelectOpen,
                    value: currentDrive?.path ?? null,
                    items: model.drives.map((drive) => ({
                      value: drive.path,
                      label: drive.letter,
                    })),
                    renderValue: (selected) =>
                      View.text(selected ? driveLetter(selected.value) : ""),
                    onOpenChange: (open) => PickerMessage.SetDriveSelectOpen({ open }),
                    onChange: (next) =>
                      next !== null && next !== currentDrive?.path
                        ? PickerMessage.SelectDrive({ path: next })
                        : undefined,
                  })
                : undefined,
              Button(h, {
                ariaLabel: model.showHidden ? "Hide hidden items" : "Show hidden items",
                class: "ml-auto",
                size: "icon-sm",
                title: model.showHidden ? "Hide hidden items" : "Show hidden items",
                type: "button",
                variant: "ghost",
                onPress: PickerMessage.ToggleShowHidden(),
              })
                .attr("aria-pressed", model.showHidden ? "true" : "false")
                .children(Icon(h, model.showHidden ? "eye" : "eye-slash", { class: "size-4" })),
            ),
            recent.length > 0 || model.favorites.length > 0
              ? h.div.class("flex flex-wrap gap-1.5").children(
                  recent.length > 0
                    ? h.ul
                        .attr("aria-label", "Recent")
                        .class("contents")
                        .children(
                          ...recent.map((item) => {
                            const label = item.label ?? recentLabel(item.path);
                            return h.li
                              .key(`recent:${item.path}`)
                              .class(
                                "flex max-w-56 items-center rounded-md border border-border text-muted-foreground text-sm transition-colors hover:text-foreground",
                              )
                              .children(
                                h.button
                                  .attr("type", "button")
                                  .attr("title", `Open ${item.path}`)
                                  .class(
                                    cn(
                                      "flex min-w-0 items-center gap-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      h.props.hasRemoveRecent ? "pr-1 pl-2" : "px-2",
                                    ),
                                  )
                                  .on("click", PickerMessage.PickRecent({ path: item.path }))
                                  .children(
                                    Icon(h, "clock-counter-clockwise", {
                                      class: "size-3.5 shrink-0",
                                    }),
                                    h.span.class("truncate").children(label),
                                  ),
                                h.props.hasRemoveRecent
                                  ? h.button
                                      .attr("type", "button")
                                      .attr("aria-label", `Remove ${label} from recent`)
                                      .attr("title", item.path)
                                      .class(
                                        "inline-flex shrink-0 items-center py-1 pr-1.5 pl-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                      )
                                      .on("click", PickerMessage.RemoveRecent({ path: item.path }))
                                      .children(Icon(h, "x", { class: "size-3" }))
                                  : undefined,
                              );
                          }),
                        )
                    : undefined,
                  model.favorites.length > 0
                    ? h.ul
                        .attr("aria-label", "Favorite folders")
                        .class("contents")
                        .children(
                          ...model.favorites.map((path) =>
                            h.li
                              .key(`fav:${path}`)
                              .class(
                                cn(
                                  "flex max-w-56 items-center rounded-md border text-sm transition-colors",
                                  model.list?.path === path
                                    ? "border-primary/60 bg-primary/10 text-foreground"
                                    : "border-border text-muted-foreground hover:text-foreground",
                                ),
                              )
                              .children(
                                h.button
                                  .attr("type", "button")
                                  .attr("title", `Go to ${path}`)
                                  .disabled(model.loading)
                                  .class(
                                    "flex min-w-0 items-center gap-1.5 py-1 pr-1 pl-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  )
                                  .on("click", PickerMessage.LoadDirectory({ path }))
                                  .children(
                                    Icon(h, "star-fill", {
                                      class: "size-3.5 shrink-0 text-primary",
                                    }),
                                    h.span.class("truncate").children(favoriteLabel(path)),
                                  ),
                                h.button
                                  .attr("type", "button")
                                  .attr(
                                    "aria-label",
                                    `Remove ${favoriteLabel(path)} from favorites`,
                                  )
                                  .class(
                                    "inline-flex shrink-0 items-center py-1 pr-1.5 pl-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                  )
                                  .on("click", PickerMessage.ToggleFavorite({ path }))
                                  .children(Icon(h, "x", { class: "size-3" })),
                              ),
                          ),
                        )
                    : undefined,
                )
              : undefined,
            ScrollArea(h, {
              class: "rounded-md border border-border bg-background/50",
              viewportClass: "max-h-[min(360px,42vh)] min-h-[220px]",
              children:
                !model.loading && !model.error && entries.length > 0
                  ? h.ul.class("divide-y divide-border/60").children(
                      ...entries.map((entry) => {
                        const schemaEntry = {
                          name: entry.name,
                          path: entry.path,
                          isDirectory: entry.isDirectory,
                        };
                        return HostFilePickerRow(h, {
                          entry,
                          muted:
                            !entry.isDirectory && !dirMode && !fileMatchesMode(h.props.mode, entry),
                          favorite: model.favorites.includes(entry.path),
                          selected: model.selectedFile?.path === entry.path && !entry.isDirectory,
                          onClick: PickerMessage.RowClicked({ entry: schemaEntry }),
                          onDoubleClick: PickerMessage.RowDoubleClicked({ entry: schemaEntry }),
                          onToggleFavorite: PickerMessage.ToggleFavorite({ path: entry.path }),
                        });
                      }),
                    )
                  : model.loading
                    ? h.div
                        .class(
                          "flex h-[220px] items-center justify-center text-muted-foreground text-sm",
                        )
                        .children("Loading…")
                    : model.error
                      ? h.div.class("p-3 text-destructive text-sm").children(model.error)
                      : h.div
                          .class(
                            "flex h-[220px] items-center justify-center text-muted-foreground text-sm",
                          )
                          .children(hiddenCount > 0 ? "Only hidden items here." : "No entries."),
            }),
          ),
          h.div.class("flex items-center gap-2 border-t border-border px-5 py-4").children(
            Button(h, {
              class: "ml-auto",
              type: "button",
              variant: "outline",
              onPress: PickerMessage.CloseRequested(),
            }).children("Cancel"),
            dirMode
              ? Button(h, {
                  disabled: !model.list?.path || model.loading,
                  type: "button",
                  onPress: PickerMessage.ConfirmDirectory(),
                }).children("Select folder")
              : Button(h, {
                  disabled:
                    !model.selectedFile ||
                    model.selectedFile.isDirectory ||
                    !fileMatchesMode(h.props.mode, model.selectedFile) ||
                    model.loading,
                  type: "button",
                  onPress: PickerMessage.ConfirmFile(),
                }).children("Select file"),
          ),
        ],
      }),
      model.showNewFolder
        ? ModalScrim(h, {
            key: "new-folder-modal",
            zIndex: "z-50",
            maxWidth: "sm",
            ariaLabelledby: "new-folder-title",
            dismissible: !model.creating,
            onDismiss: () => PickerMessage.CancelNewFolder(),
            children: [
              h.div
                .class("flex items-start justify-between gap-4 border-b border-border px-5 py-4")
                .children(
                  h.div.children(
                    h.h2
                      .attr("id", "new-folder-title")
                      .class("font-semibold text-foreground text-lg leading-none")
                      .children("New folder"),
                    locationLabel
                      ? h.p
                          .attr("title", locationLabel)
                          .class("mt-1 truncate text-muted-foreground text-sm")
                          .children(locationLabel)
                      : undefined,
                  ),
                  Button(h, {
                    ariaLabel: "Close new folder dialog",
                    class: "shrink-0",
                    disabled: model.creating,
                    size: "icon-sm",
                    type: "button",
                    variant: "ghost",
                    onPress: PickerMessage.CancelNewFolder(),
                  }).children(Icon(h, "x", { class: "size-4" })),
                ),
              h.form
                .class("flex flex-col gap-4 px-5 py-4")
                .on("submit", () => (model.creating ? undefined : PickerMessage.ConfirmNewFolder()))
                .children(
                  Field(h, { class: "gap-2" }).children(
                    FieldLabel(h, { for: "new-folder-name" }).children("Folder name"),
                    Input(h, {
                      disabled: model.creating,
                      id: "new-folder-name",
                      name: "new-folder-name",
                      placeholder: "e.g. experiment-01…",
                      type: "text",
                      value: model.folderName,
                      onInput: (value) => PickerMessage.TypedFolderName({ value }),
                    })
                      .attr("autocomplete", "off")
                      .attr("autofocus", ""),
                    model.folderError
                      ? h.p
                          .attr("role", "alert")
                          .class("text-destructive text-sm")
                          .children(model.folderError)
                      : undefined,
                  ),
                ),
              h.div.class("flex justify-end gap-2 border-t border-border px-5 py-4").children(
                Button(h, {
                  disabled: model.creating,
                  type: "button",
                  variant: "outline",
                  onPress: PickerMessage.CancelNewFolder(),
                }).children("Cancel"),
                Button(h, {
                  disabled: model.creating || !model.folderName.trim(),
                  type: "button",
                  onPress: PickerMessage.ConfirmNewFolder(),
                }).children(model.creating ? "Creating…" : "Create"),
              ),
            ],
          })
        : undefined,
    );
  },
});

export type HostFilePickerDialogOptions<M> = {
  readonly key?: string | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => M;
  readonly mode: HostFilePickerMode;
  readonly title: string;
  readonly description?: string | undefined;
  readonly recentItems?: readonly HostFilePickerRecentItem[] | undefined;
  readonly onPickRecent?: ((path: string) => M) | undefined;
  readonly onRemoveRecent?: ((path: string) => M) | undefined;
  readonly onPickDirectory: (path: string) => M;
  readonly onPickFile: (path: string) => M;
};

export type HostFilePickerDialogProps<M = never> = HostFilePickerDialogOptions<M>;

export function HostFilePickerDialog<M>(h: Html.H<M>, options: HostFilePickerDialogOptions<M>) {
  return HostFilePickerComponent(h, {
    ...(options.key !== undefined ? { key: options.key } : {}),
    props: {
      open: options.open,
      mode: options.mode,
      title: options.title,
      ...(options.description !== undefined ? { description: options.description } : {}),
      ...(options.recentItems !== undefined ? { recentItems: options.recentItems } : {}),
      hasPickRecent: options.onPickRecent !== undefined,
      hasRemoveRecent: options.onRemoveRecent !== undefined,
    },
    onEmit: {
      OpenChanged: ({ open }) => options.onOpenChange(open),
      PickedDirectory: ({ path }) => options.onPickDirectory(path),
      PickedFile: ({ path }) => options.onPickFile(path),
      PickedRecent: ({ path }) => options.onPickRecent?.(path),
      RemovedRecent: ({ path }) => options.onRemoveRecent?.(path),
    },
  });
}
