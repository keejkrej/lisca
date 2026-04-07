import { Effect } from "effect";
import { createStore } from "zustand/vanilla";

import type {
  FrameResult,
  ViewerSelection,
  ViewerSource,
  WorkspaceScan,
} from "lisca/viewer/contracts";
import {
  clearExcludedCellIds,
  createDefaultGrid,
  makeSourceKey,
  mergeExcludedCellIds,
  normalizeGridState,
  setExcludedCellIdsForPosition,
  toggleExcludedCellIds,
  type ExcludedCellIdsByPosition,
  type GridState,
} from "lisca/viewer/core";

const LAST_IMAGE_SOURCE_KEY = "view.lastImageSource";
const LAST_WORKSPACE_KEY = "view.lastWorkspace";
const LAST_SOURCE_KEY = "view.lastSource";
const LAST_ROOT_KEY = "view.lastRoot";
const LAST_GRID_KEY = "view.grid";
const EXCLUDED_BBOX_KEY_PREFIX = "view.excludedBboxes";

export type SaveState =
  | { type: "idle"; message: null }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export type CropState = SaveState;

export type ContrastMode = "auto" | "manual";
const DEFAULT_CONTRAST_MIN = 0;
const DEFAULT_CONTRAST_MAX = 65535;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

type StateUpdater<T> = T | ((current: T) => T);

export interface ViewStoreState {
  workspacePath: string | null;
  source: ViewerSource | null;
  scan: WorkspaceScan | null;
  selection: ViewerSelection | null;
  grid: GridState;
  frame: FrameResult | null;
  loading: boolean;
  error: string | null;
  contrastMin: number;
  contrastMax: number;
  contrastMode: ContrastMode;
  contrastReloadToken: number;
  timeSliderIndex: number;
  selectionMode: boolean;
  excludedCellIdsByPosition: ExcludedCellIdsByPosition;
  saveState: SaveState;
  saving: boolean;
  cropState: CropState;
  cropping: boolean;
}

export const IDLE_SAVE_STATE: SaveState = { type: "idle", message: null };

function runSync<A>(effect: Effect.Effect<A, never, never>): A {
  return Effect.runSync(effect);
}

function resolveStorage(): StorageLike | null {
  if (typeof window !== "undefined" && window.sessionStorage) return window.sessionStorage;
  return null;
}

function clearLegacyPersistentStorage() {
  if (typeof window === "undefined" || !window.localStorage) return;

  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    if (
      key === LAST_IMAGE_SOURCE_KEY ||
      key === LAST_WORKSPACE_KEY ||
      key === LAST_SOURCE_KEY ||
      key === LAST_ROOT_KEY ||
      key === LAST_GRID_KEY ||
      key.startsWith(`${EXCLUDED_BBOX_KEY_PREFIX}:`)
    ) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

function readStoredGrid(storage: StorageLike | null): GridState {
  if (!storage) return createDefaultGrid();
  try {
    const raw = storage.getItem(LAST_GRID_KEY);
    if (!raw) return createDefaultGrid();
    return normalizeGridState(JSON.parse(raw) as Partial<GridState>);
  } catch {
    return createDefaultGrid();
  }
}

function parseStoredSource(raw: string | null): ViewerSource | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ViewerSource>;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.kind === "tif" || parsed.kind === "nd2" || parsed.kind === "czi") &&
      typeof parsed.path === "string" &&
      parsed.path
    ) {
      return { kind: parsed.kind, path: parsed.path };
    }
  } catch {}

  return null;
}

function parseLegacySource(raw: string | null): ViewerSource | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { kind?: string; path?: string };
    if (parsed?.kind === "workspace" && typeof parsed.path === "string" && parsed.path) {
      return { kind: "tif", path: parsed.path };
    }
  } catch {
    return { kind: "tif", path: raw };
  }
  return null;
}

function readStoredWorkspacePath(storage: StorageLike | null): string | null {
  const stored = storage?.getItem(LAST_WORKSPACE_KEY);
  if (stored) return stored;

  const legacyRoot = storage?.getItem(LAST_ROOT_KEY);
  if (legacyRoot) return legacyRoot;

  const legacySource = parseLegacySource(storage?.getItem(LAST_SOURCE_KEY) ?? null);
  return legacySource?.path ?? null;
}

function readStoredSource(storage: StorageLike | null, workspacePath: string | null): ViewerSource | null {
  const source = parseStoredSource(storage?.getItem(LAST_IMAGE_SOURCE_KEY) ?? null);
  if (workspacePath && source) return source;

  const legacySource = parseLegacySource(storage?.getItem(LAST_SOURCE_KEY) ?? null);
  if (legacySource) return legacySource;

  return null;
}

function excludedBboxStorageKey(source: ViewerSource): string {
  return `${EXCLUDED_BBOX_KEY_PREFIX}:${encodeURIComponent(makeSourceKey(source))}`;
}

function readStoredExcludedCellIds(
  storage: StorageLike | null,
  source: ViewerSource | null,
): ExcludedCellIdsByPosition {
  if (!storage || !source) return {};

  try {
    let raw = storage.getItem(excludedBboxStorageKey(source));
    if (!raw && source.kind === "tif") {
      raw = storage.getItem(`${EXCLUDED_BBOX_KEY_PREFIX}:${encodeURIComponent(source.path)}`);
    }
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed).flatMap(([position, value]) => {
      if (!Array.isArray(value)) return [];
      const numericPosition = Number(position);
      if (!Number.isInteger(numericPosition)) return [];
      return [
        [
          numericPosition,
          value.filter((item): item is string => typeof item === "string"),
        ] as const,
      ];
    });
    return Object.fromEntries(entries);
  } catch {
    return {};
  }
}

function persistWorkspacePathEffect(storage: StorageLike | null, workspacePath: string | null) {
  return Effect.sync(() => {
    if (!storage) return;
    if (workspacePath) {
      storage.setItem(LAST_WORKSPACE_KEY, workspacePath);
    } else {
      storage.removeItem(LAST_WORKSPACE_KEY);
    }
    storage.removeItem(LAST_ROOT_KEY);
  }).pipe(Effect.withSpan("view-store.persist-workspace-path"));
}

function persistSourceEffect(storage: StorageLike | null, source: ViewerSource | null) {
  return Effect.sync(() => {
    if (!storage) return;
    if (source) {
      storage.setItem(LAST_IMAGE_SOURCE_KEY, JSON.stringify(source));
    } else {
      storage.removeItem(LAST_IMAGE_SOURCE_KEY);
    }
    storage.removeItem(LAST_SOURCE_KEY);
  }).pipe(Effect.withSpan("view-store.persist-source"));
}

function persistGridEffect(storage: StorageLike | null, grid: GridState) {
  return Effect.sync(() => {
    if (!storage) return;
    storage.setItem(LAST_GRID_KEY, JSON.stringify(grid));
  }).pipe(Effect.withSpan("view-store.persist-grid"));
}

function persistExcludedCellIdsEffect(
  storage: StorageLike | null,
  source: ViewerSource | null,
  excludedCellIdsByPosition: ExcludedCellIdsByPosition,
) {
  return Effect.sync(() => {
    if (!storage || !source) return;
    if (Object.keys(excludedCellIdsByPosition).length === 0) {
      storage.removeItem(excludedBboxStorageKey(source));
      return;
    }
    storage.setItem(
      excludedBboxStorageKey(source),
      JSON.stringify(excludedCellIdsByPosition),
    );
  }).pipe(Effect.withSpan("view-store.persist-excluded-cell-ids"));
}

function resolveNextValue<T>(current: T, next: StateUpdater<T>): T {
  if (typeof next === "function") {
    return (next as (value: T) => T)(current);
  }
  return next;
}

function resetViewerState(
  state: ViewStoreState,
  overrides: Partial<ViewStoreState> = {},
): ViewStoreState {
  return {
    ...state,
    scan: null,
    selection: null,
    frame: null,
    loading: false,
    error: null,
    contrastMin: DEFAULT_CONTRAST_MIN,
    contrastMax: DEFAULT_CONTRAST_MAX,
    contrastMode: "manual",
    contrastReloadToken: 0,
    timeSliderIndex: 0,
    selectionMode: false,
    saveState: IDLE_SAVE_STATE,
    saving: false,
    cropState: IDLE_SAVE_STATE,
    cropping: false,
    ...overrides,
  };
}

function createInitialState(): ViewStoreState {
  return runSync(
    Effect.gen(function* () {
      const storage = yield* Effect.sync(resolveStorage);
      const workspacePath = yield* Effect.sync(() => readStoredWorkspacePath(storage));
      const source = yield* Effect.sync(() => readStoredSource(storage, workspacePath));

      yield* Effect.sync(clearLegacyPersistentStorage);

      return {
        workspacePath,
        source,
        scan: null,
        selection: null,
        grid: readStoredGrid(storage),
        frame: null,
        loading: false,
        error: null,
        contrastMin: DEFAULT_CONTRAST_MIN,
        contrastMax: DEFAULT_CONTRAST_MAX,
        contrastMode: "manual",
        contrastReloadToken: 0,
        timeSliderIndex: 0,
        selectionMode: false,
        excludedCellIdsByPosition: readStoredExcludedCellIds(storage, source),
        saveState: IDLE_SAVE_STATE,
        saving: false,
        cropState: IDLE_SAVE_STATE,
        cropping: false,
      } satisfies ViewStoreState;
    }).pipe(Effect.withSpan("view-store.create-initial-state")),
  );
}

export const viewStore = createStore<ViewStoreState>(() => createInitialState());

export function setWorkspacePath(workspacePath: string | null) {
  runSync(persistWorkspacePathEffect(resolveStorage(), workspacePath));
  viewStore.setState((state) => ({ ...state, workspacePath }));
}

export function setSource(source: ViewerSource | null) {
  const storage = resolveStorage();
  runSync(persistSourceEffect(storage, source));
  viewStore.setState((state) =>
    resetViewerState(state, {
      source,
      excludedCellIdsByPosition: readStoredExcludedCellIds(storage, source),
    }),
  );
}

export function patchViewState(patch: Partial<ViewStoreState>) {
  viewStore.setState((state) => ({ ...state, ...patch }));
}

export function setGrid(next: StateUpdater<GridState>) {
  viewStore.setState((state) => {
    const grid = resolveNextValue(state.grid, next);
    runSync(persistGridEffect(resolveStorage(), grid));
    return { ...state, grid };
  });
}

export function resetGrid() {
  viewStore.setState((state) => {
    const grid = {
      ...createDefaultGrid(),
      enabled: state.grid.enabled,
    };
    const excludedCellIdsByPosition = clearExcludedCellIds();
    runSync(persistGridEffect(resolveStorage(), grid));
    runSync(persistExcludedCellIdsEffect(resolveStorage(), state.source, excludedCellIdsByPosition));
    return {
      ...state,
      grid,
      excludedCellIdsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function toggleGridEnabled() {
  viewStore.setState((state) => {
    const grid = { ...state.grid, enabled: !state.grid.enabled };
    runSync(persistGridEffect(resolveStorage(), grid));
    return { ...state, grid };
  });
}

export function setSelectionKey<K extends keyof ViewerSelection>(
  key: K,
  value: ViewerSelection[K],
) {
  viewStore.setState((state) => {
    if (!state.selection) return state;
    return {
      ...state,
      selection: { ...state.selection, [key]: value },
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function setTimeSliderIndex(timeSliderIndex: number) {
  viewStore.setState((state) => ({ ...state, timeSliderIndex }));
}

export function setSelectionMode(selectionMode: boolean | ((current: boolean) => boolean)) {
  viewStore.setState((state) => ({
    ...state,
    selectionMode: resolveNextValue(state.selectionMode, selectionMode),
  }));
}

export function setSaveState(saveState: SaveState) {
  viewStore.setState((state) => ({ ...state, saveState }));
}

export function setSaving(saving: boolean) {
  viewStore.setState((state) => ({ ...state, saving }));
}

export function setCropState(cropState: CropState) {
  viewStore.setState((state) => ({ ...state, cropState }));
}

export function setCropping(cropping: boolean) {
  viewStore.setState((state) => ({ ...state, cropping }));
}

export function reloadAutoContrast() {
  viewStore.setState((state) => ({
    ...state,
    contrastMode: "auto",
    contrastReloadToken: state.contrastReloadToken + 1,
  }));
}

export function toggleExcludedCells(position: number, cellIds: Iterable<string>) {
  viewStore.setState((state) => {
    const nextCellIds = toggleExcludedCellIds(state.excludedCellIdsByPosition[position] ?? [], cellIds);
    const currentCellIds = state.excludedCellIdsByPosition[position] ?? [];
    if (
      nextCellIds.length === currentCellIds.length &&
      nextCellIds.every((cellId, index) => cellId === currentCellIds[index])
    ) {
      return state;
    }

    const excludedCellIdsByPosition = setExcludedCellIdsForPosition(
      state.excludedCellIdsByPosition,
      position,
      nextCellIds,
    );

    runSync(
      persistExcludedCellIdsEffect(resolveStorage(), state.source, excludedCellIdsByPosition),
    );

    return {
      ...state,
      excludedCellIdsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function excludeCells(position: number, cellIds: Iterable<string>) {
  viewStore.setState((state) => {
    const nextCellIds = mergeExcludedCellIds(state.excludedCellIdsByPosition[position] ?? [], cellIds);
    const currentCellIds = state.excludedCellIdsByPosition[position] ?? [];
    if (
      nextCellIds.length === currentCellIds.length &&
      nextCellIds.every((cellId, index) => cellId === currentCellIds[index])
    ) {
      return state;
    }

    const excludedCellIdsByPosition = setExcludedCellIdsForPosition(
      state.excludedCellIdsByPosition,
      position,
      nextCellIds,
    );

    runSync(
      persistExcludedCellIdsEffect(resolveStorage(), state.source, excludedCellIdsByPosition),
    );

    return {
      ...state,
      excludedCellIdsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function resetExcludedCells(position: number) {
  viewStore.setState((state) => {
    if (!(position in state.excludedCellIdsByPosition)) {
      return state;
    }

    const excludedCellIdsByPosition = setExcludedCellIdsForPosition(
      state.excludedCellIdsByPosition,
      position,
      [],
    );

    runSync(
      persistExcludedCellIdsEffect(resolveStorage(), state.source, excludedCellIdsByPosition),
    );

    return {
      ...state,
      excludedCellIdsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}
