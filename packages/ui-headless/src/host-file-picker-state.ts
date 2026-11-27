import type { HostDrive, HostFsEntry, HostListDirectoryResult } from "@lisca/contracts";
import {
  liscaLocalStorage,
  readStorageJson,
  writeStorageJson,
  type HostFilePickerMode,
  type HostFilePickerOperations,
} from "@lisca/utils";

export const HOST_FILE_PICKER_FAVORITES_STORAGE_KEY = "lisca.hostFilePicker.favorites";

function pathExtLower(name: string): string {
  const index = name.lastIndexOf(".");
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index).toLowerCase();
}

export function fileMatchesMode(mode: HostFilePickerMode, entry: HostFsEntry): boolean {
  if (entry.isDirectory) return false;
  const ext = pathExtLower(entry.name);
  if (mode === "nd2_file") return ext === ".nd2";
  if (mode === "czi_file") return ext === ".czi";
  if (mode === "assay_json_file") return ext === ".json";
  return false;
}

export function isDirectoryMode(mode: HostFilePickerMode): boolean {
  return mode === "workspace" || mode === "folder";
}

export function parentPathForGoUp(parent: string | null | undefined): string | null {
  if (parent == null) return null;
  return parent === "" ? null : parent;
}

export function canGoUpFromList(list: HostListDirectoryResult | null): boolean {
  return Boolean(list?.path && list.parent != null);
}

export function hostFilePickerLocationLabel(list: HostListDirectoryResult | null): string | null {
  const path = list?.path?.trim();
  return path ? path : null;
}

export function isHiddenEntry(entry: HostFsEntry): boolean {
  return entry.name.startsWith(".");
}

export function visibleEntries(
  entries: readonly HostFsEntry[],
  showHidden: boolean,
): readonly HostFsEntry[] {
  return showHidden ? entries : entries.filter((entry) => !isHiddenEntry(entry));
}

export function favoriteLabel(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  const name = trimmed.slice(Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\")) + 1);
  return name || path;
}

/** The drive whose letter prefixes `path`, or null for a non-Windows path. */
export function driveForPath(
  path: string | null | undefined,
  drives: readonly HostDrive[],
): HostDrive | null {
  if (!path) return null;
  const match = /^([A-Za-z]):/.exec(path);
  const letter = match?.[1];
  if (!letter) return null;
  const normalized = `${letter.toUpperCase()}:`;
  return drives.find((drive) => drive.letter.toUpperCase() === normalized) ?? null;
}

/** Label for the desktop native dialog. The ellipsis is omitted on purpose. */
export function nativeFilePickerLabel(platform: string, windowsHost: boolean): string {
  if (windowsHost || /win/i.test(platform)) return "Open in Explorer";
  if (/mac/i.test(platform)) return "Open in Finder";
  return "Open in Files";
}

export function nativePickerExtensions(mode: HostFilePickerMode): string[] {
  if (mode === "nd2_file") return ["nd2"];
  if (mode === "czi_file") return ["czi"];
  if (mode === "assay_json_file") return ["json"];
  return [];
}

/** Chip label for a recent pick: an `assay.json` is named after its folder. */
export function recentLabel(path: string): string {
  const name = favoriteLabel(path);
  if (name.toLowerCase() !== "assay.json") return name;
  const folder = path.replace(/[\\/]+$/, "").slice(0, -name.length);
  return folder ? favoriteLabel(folder) : name;
}

export function normalizeFavoritePaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const paths = value.filter((item): item is string => typeof item === "string" && item !== "");
  return [...new Set(paths)];
}

export function toggleFavoritePath(favorites: readonly string[], path: string): string[] {
  return favorites.includes(path)
    ? favorites.filter((item) => item !== path)
    : [...favorites, path];
}

function readFavoritePaths(): string[] {
  return normalizeFavoritePaths(
    readStorageJson<unknown>(liscaLocalStorage(), HOST_FILE_PICKER_FAVORITES_STORAGE_KEY),
  );
}

function formatHostError(cause: unknown): string {
  return cause instanceof Error && cause.message.includes("Could not parse JSON")
    ? "Could not reach the API server. Ensure the Rust backend is running."
    : cause instanceof Error
      ? cause.message
      : String(cause);
}

export type HostFilePickerControllerOptions = {
  open?: boolean | undefined;
  mode: HostFilePickerMode;
  hostPort: HostFilePickerOperations;
  onOpenChange?: ((open: boolean) => void) | undefined;
  onPickDirectory: (path: string) => void;
  onPickFile: (path: string) => void;
};

export type UseHostFilePickerStateOptions = HostFilePickerControllerOptions;

export type HostFilePickerState = {
  open: boolean;
  mode: HostFilePickerMode;
  list: HostListDirectoryResult | null;
  loading: boolean;
  error: string | null;
  selectedFile: HostFsEntry | null;
  dirMode: boolean;
  canGoUp: boolean;
  locationLabel: string | null;
  windowsHost: boolean;
  drives: HostDrive[];
  currentDrive: HostDrive | null;
  canOpenNative: boolean;
  pickingNative: boolean;
  entries: readonly HostFsEntry[];
  hiddenCount: number;
  showHidden: boolean;
  favorites: string[];
};

export type HostFilePickerListener = (state: HostFilePickerState) => void;

export type HostFilePickerController = {
  getState: () => HostFilePickerState;
  subscribe: (listener: HostFilePickerListener) => () => void;
  open: (nextMode?: HostFilePickerMode) => void;
  close: () => void;
  setMode: (mode: HostFilePickerMode) => void;
  loadPath: (path: string | null) => Promise<void>;
  toggleShowHidden: () => void;
  isFavorite: (path: string) => boolean;
  toggleFavorite: (path: string) => void;
  openFavorite: (path: string) => void;
  selectDrive: (path: string) => void;
  openNative: () => Promise<void>;
  goUp: () => void;
  goHome: () => Promise<void>;
  createDirectory: (name: string) => Promise<void>;
  confirmDirectory: () => void;
  confirmFile: () => void;
  handleRowClick: (entry: HostFsEntry) => void;
  handleRowDoubleClick: (entry: HostFsEntry) => void;
  fileMatchesMode: (entry: HostFsEntry) => boolean;
  dispose: () => void;
};

export function createHostFilePickerController(
  options: HostFilePickerControllerOptions,
): HostFilePickerController {
  let isOpen = false;
  let mode: HostFilePickerMode = options.mode;
  let list: HostListDirectoryResult | null = null;
  let loading = false;
  let error: string | null = null;
  let selectedFile: HostFsEntry | null = null;
  let showHidden = false;
  let favorites: string[] = readFavoritePaths();
  let windowsHost = false;
  let drives: HostDrive[] = [];
  let pickingNative = false;
  let openGeneration = 0;
  let listGeneration = 0;
  let disposed = false;
  const listeners = new Set<HostFilePickerListener>();

  const buildSnapshot = (): HostFilePickerState => {
    const rawEntries = list?.entries ?? [];
    return {
      open: isOpen,
      mode,
      list,
      loading,
      error,
      selectedFile,
      dirMode: isDirectoryMode(mode),
      canGoUp: canGoUpFromList(list),
      locationLabel: hostFilePickerLocationLabel(list),
      windowsHost,
      drives,
      currentDrive: driveForPath(list?.path, drives),
      canOpenNative: Boolean(options.hostPort.openNativePicker),
      pickingNative,
      entries: visibleEntries(rawEntries, showHidden),
      hiddenCount: rawEntries.filter((entry) => isHiddenEntry(entry)).length,
      showHidden,
      favorites,
    };
  };

  let snapshot = buildSnapshot();

  const emit = () => {
    snapshot = buildSnapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const loadPath = async (path: string | null) => {
    if (disposed) return;
    listGeneration += 1;
    const currentListGeneration = listGeneration;
    loading = true;
    error = null;
    emit();
    try {
      const result = await options.hostPort.listDirectory(path);
      if (disposed || currentListGeneration !== listGeneration) return;
      list = result;
      selectedFile = null;
    } catch (cause) {
      if (disposed || currentListGeneration !== listGeneration) return;
      list = null;
      error = formatHostError(cause);
    } finally {
      if (!disposed && currentListGeneration === listGeneration) {
        loading = false;
        emit();
      }
    }
  };

  const open = (nextMode?: HostFilePickerMode) => {
    if (disposed) return;
    openGeneration += 1;
    listGeneration += 1;
    const currentOpenGeneration = openGeneration;
    const currentListGeneration = listGeneration;
    isOpen = true;
    if (nextMode !== undefined) {
      mode = nextMode;
    }
    list = null;
    selectedFile = null;
    error = null;
    showHidden = false;
    favorites = readFavoritePaths();
    windowsHost = false;
    drives = [];
    loading = true;
    emit();

    void options.hostPort
      .windowsDrives()
      .then((result) => {
        if (disposed || currentOpenGeneration !== openGeneration) return;
        windowsHost = result.windows;
        drives = result.windows ? result.drives : [];
        emit();
      })
      .catch(() => {
        if (disposed || currentOpenGeneration !== openGeneration) return;
        windowsHost = false;
        drives = [];
        emit();
      });

    void (async () => {
      try {
        const home = await options.hostPort.userHomeDirectory();
        const result = await options.hostPort.listDirectory(home);
        if (disposed || currentListGeneration !== listGeneration) return;
        list = result;
        selectedFile = null;
      } catch (cause) {
        if (disposed || currentListGeneration !== listGeneration) return;
        list = null;
        error = formatHostError(cause);
      } finally {
        if (!disposed && currentListGeneration === listGeneration) {
          loading = false;
          emit();
        }
      }
    })();
  };

  const close = () => {
    if (disposed) return;
    openGeneration += 1;
    listGeneration += 1;
    const wasOpen = isOpen;
    isOpen = false;
    loading = false;
    emit();
    if (wasOpen) {
      options.onOpenChange?.(false);
    }
  };

  const setMode = (nextMode: HostFilePickerMode) => {
    if (disposed || mode === nextMode) return;
    mode = nextMode;
    if (selectedFile && !fileMatchesMode(nextMode, selectedFile)) {
      selectedFile = null;
    }
    emit();
  };

  const toggleShowHidden = () => {
    if (disposed) return;
    showHidden = !showHidden;
    if (!showHidden && selectedFile && isHiddenEntry(selectedFile)) {
      selectedFile = null;
    }
    emit();
  };

  const isFavorite = (path: string) => favorites.includes(path);

  const toggleFavorite = (path: string) => {
    if (disposed) return;
    const next = toggleFavoritePath(readFavoritePaths(), path);
    favorites = next;
    writeStorageJson(liscaLocalStorage(), HOST_FILE_PICKER_FAVORITES_STORAGE_KEY, next);
    emit();
  };

  const openFavorite = (path: string) => {
    void loadPath(path);
  };

  const selectDrive = (path: string) => {
    if (path === snapshot.currentDrive?.path) return;
    void loadPath(path);
  };

  const openNative = async () => {
    const pick = options.hostPort.openNativePicker;
    if (disposed || !pick || pickingNative) return;
    pickingNative = true;
    error = null;
    emit();
    try {
      const path = await pick({
        directory: isDirectoryMode(mode),
        directoryPath: list?.path ?? null,
        extensions: nativePickerExtensions(mode),
      });
      if (disposed || !path) return;
      if (isDirectoryMode(mode)) options.onPickDirectory(path);
      else options.onPickFile(path);
      close();
    } catch (cause) {
      if (disposed) return;
      error = cause instanceof Error ? cause.message : String(cause);
      emit();
    } finally {
      if (!disposed) {
        pickingNative = false;
        emit();
      }
    }
  };

  const goUp = () => {
    const parent = list?.parent;
    if (parent == null) return;
    void loadPath(parent === "" ? null : parent);
  };

  const goHome = async () => {
    if (disposed) return;
    try {
      const home = await options.hostPort.userHomeDirectory();
      if (disposed) return;
      await loadPath(home);
    } catch (cause) {
      if (disposed) return;
      list = null;
      error = formatHostError(cause);
      emit();
    }
  };

  const createDirectory = async (name: string) => {
    const currentList = list;
    if (!currentList?.path) return;
    try {
      await options.hostPort.createDirectory(currentList.path, name);
    } catch (cause) {
      throw new Error(formatHostError(cause), { cause });
    }
    await loadPath(currentList.path);
  };

  const navigateToEntry = (entry: HostFsEntry) => {
    if (entry.isDirectory) void loadPath(entry.path);
  };

  const confirmDirectory = () => {
    const currentList = list;
    if (!currentList?.path) return;
    options.onPickDirectory(currentList.path);
    close();
  };

  const confirmFile = () => {
    if (!selectedFile || selectedFile.isDirectory || !fileMatchesMode(mode, selectedFile)) return;
    options.onPickFile(selectedFile.path);
    close();
  };

  const handleRowClick = (entry: HostFsEntry) => {
    if (entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (fileMatchesMode(mode, entry)) {
      selectedFile = entry;
      emit();
    }
  };

  const handleRowDoubleClick = (entry: HostFsEntry) => {
    if (entry.isDirectory) {
      navigateToEntry(entry);
      return;
    }
    if (!isDirectoryMode(mode) && fileMatchesMode(mode, entry)) {
      options.onPickFile(entry.path);
      close();
    }
  };

  if (options.open) {
    open();
  }

  return {
    getState: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    open,
    close,
    setMode,
    loadPath,
    toggleShowHidden,
    isFavorite,
    toggleFavorite,
    openFavorite,
    selectDrive,
    openNative,
    goUp,
    goHome,
    createDirectory,
    confirmDirectory,
    confirmFile,
    handleRowClick,
    handleRowDoubleClick,
    fileMatchesMode: (entry: HostFsEntry) => fileMatchesMode(mode, entry),
    dispose: () => {
      disposed = true;
      openGeneration += 1;
      listGeneration += 1;
      listeners.clear();
    },
  };
}
