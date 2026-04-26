import { Effect } from "effect";
import { createStore } from "zustand/vanilla";

import type {
  FrameResult,
  SavedAlignState,
  ViewerSelection,
  ViewerSource,
  WorkspaceScan,
} from "lisca/shared/contracts";
import {
  clearExcludedCells as clearExcludedCellsMap,
  createDefaultGrid,
  makeSourceKey,
  mergeExcludedCells as mergeExcludedCellCoords,
  normalizeGridState,
  setExcludedCellsForPosition,
  toggleExcludedCells as toggleExcludedCellCoords,
  type ExcludedCellsByPosition,
  type GridCellCoord,
  type GridState,
} from "lisca/shared/core";
import {
  persistStoredString,
  readStoredStringWithFallback,
  resolveSessionStorage,
  setWorkspacePath as setSharedWorkspacePath,
  type SessionStorageLike,
} from "lisca/shared/state";

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

type StorageLike = SessionStorageLike;

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
  excludedCellsByPosition: ExcludedCellsByPosition;
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
  return resolveSessionStorage();
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
      (parsed.kind === "tif" || parsed.kind === "jpg" || parsed.kind === "nd2" || parsed.kind === "czi") &&
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
  const stored = readStoredStringWithFallback(storage, LAST_WORKSPACE_KEY, LAST_ROOT_KEY);
  if (stored) return stored;

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

function isStoredGridCellCoord(value: unknown): value is GridCellCoord {
  return (
    !!value &&
    typeof value === "object" &&
    Number.isInteger((value as GridCellCoord).i) &&
    Number.isInteger((value as GridCellCoord).j)
  );
}

function readStoredExcludedCells(
  storage: StorageLike | null,
  source: ViewerSource | null,
): ExcludedCellsByPosition {
  if (!storage || !source) return {};

  try {
    let raw = storage.getItem(excludedBboxStorageKey(source));
    if (!raw && (source.kind === "tif" || source.kind === "jpg")) {
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
          value.filter(isStoredGridCellCoord),
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
    persistStoredString(storage, LAST_WORKSPACE_KEY, workspacePath, LAST_ROOT_KEY);
  }).pipe(Effect.withSpan("viewer-store.persist-workspace-path"));
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
  }).pipe(Effect.withSpan("viewer-store.persist-source"));
}

function persistGridEffect(storage: StorageLike | null, grid: GridState) {
  return Effect.sync(() => {
    if (!storage) return;
    storage.setItem(LAST_GRID_KEY, JSON.stringify(grid));
  }).pipe(Effect.withSpan("viewer-store.persist-grid"));
}

function persistExcludedCellsEffect(
  storage: StorageLike | null,
  source: ViewerSource | null,
  excludedCellsByPosition: ExcludedCellsByPosition,
) {
  return Effect.sync(() => {
    if (!storage || !source) return;
    if (Object.keys(excludedCellsByPosition).length === 0) {
      storage.removeItem(excludedBboxStorageKey(source));
      return;
    }
    storage.setItem(excludedBboxStorageKey(source), JSON.stringify(excludedCellsByPosition));
  }).pipe(Effect.withSpan("viewer-store.persist-excluded-cell-ids"));
}

function resolveNextValue<T>(current: T, next: StateUpdater<T>): T {
  if (typeof next === "function") {
    return (next as (value: T) => T)(current);
  }
  return next;
}

function replaceExcludedCellsForPosition(
  current: ExcludedCellsByPosition,
  position: number,
  cells: Iterable<GridCellCoord>,
): ExcludedCellsByPosition {
  return setExcludedCellsForPosition(current, position, Array.from(cells));
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
        excludedCellsByPosition: readStoredExcludedCells(storage, source),
        saveState: IDLE_SAVE_STATE,
        saving: false,
        cropState: IDLE_SAVE_STATE,
        cropping: false,
      } satisfies ViewStoreState;
    }).pipe(Effect.withSpan("viewer-store.create-initial-state")),
  );
}

export const viewerStore = createStore<ViewStoreState>(() => createInitialState());

export function setWorkspacePath(workspacePath: string | null) {
  setSharedWorkspacePath(workspacePath);
  runSync(persistWorkspacePathEffect(resolveStorage(), workspacePath));
  viewerStore.setState((state) => ({ ...state, workspacePath }));
}

export function setSource(source: ViewerSource | null) {
  const storage = resolveStorage();
  runSync(persistSourceEffect(storage, source));
  viewerStore.setState((state) =>
    resetViewerState(state, {
      source,
      excludedCellsByPosition: readStoredExcludedCells(storage, source),
    }),
  );
}

export function patchViewState(patch: Partial<ViewStoreState>) {
  viewerStore.setState((state) => ({ ...state, ...patch }));
}

export function setGrid(next: StateUpdater<GridState>) {
  viewerStore.setState((state) => {
    const grid = resolveNextValue(state.grid, next);
    runSync(persistGridEffect(resolveStorage(), grid));
    return { ...state, grid };
  });
}

export function resetGrid() {
  viewerStore.setState((state) => {
    const grid = {
      ...createDefaultGrid(),
      enabled: state.grid.enabled,
    };
    const excludedCellsByPosition = clearExcludedCellsMap();
    runSync(persistGridEffect(resolveStorage(), grid));
    runSync(persistExcludedCellsEffect(resolveStorage(), state.source, excludedCellsByPosition));
    return {
      ...state,
      grid,
      excludedCellsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function toggleGridEnabled() {
  viewerStore.setState((state) => {
    const grid = { ...state.grid, enabled: !state.grid.enabled };
    runSync(persistGridEffect(resolveStorage(), grid));
    return { ...state, grid };
  });
}

export function setSelectionKey<K extends keyof ViewerSelection>(
  key: K,
  value: ViewerSelection[K],
) {
  viewerStore.setState((state) => {
    if (!state.selection) return state;
    return {
      ...state,
      selection: { ...state.selection, [key]: value },
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function setTimeSliderIndex(timeSliderIndex: number) {
  viewerStore.setState((state) => ({ ...state, timeSliderIndex }));
}

export function setSelectionMode(selectionMode: boolean | ((current: boolean) => boolean)) {
  viewerStore.setState((state) => ({
    ...state,
    selectionMode: resolveNextValue(state.selectionMode, selectionMode),
  }));
}

export function setSaveState(saveState: SaveState) {
  viewerStore.setState((state) => ({ ...state, saveState }));
}

export function setSaving(saving: boolean) {
  viewerStore.setState((state) => ({ ...state, saving }));
}

export function setCropState(cropState: CropState) {
  viewerStore.setState((state) => ({ ...state, cropState }));
}

export function setCropping(cropping: boolean) {
  viewerStore.setState((state) => ({ ...state, cropping }));
}

export function reloadAutoContrast() {
  viewerStore.setState((state) => ({
    ...state,
    contrastMode: "auto",
    contrastReloadToken: state.contrastReloadToken + 1,
  }));
}

export function toggleExcludedCells(position: number, cells: Iterable<GridCellCoord>) {
  viewerStore.setState((state) => {
    const nextCells = toggleExcludedCellCoords(state.excludedCellsByPosition[position] ?? [], cells);
    const currentCells = state.excludedCellsByPosition[position] ?? [];
    if (
      nextCells.length === currentCells.length &&
      nextCells.every(
        (cell, index) => cell.i === currentCells[index]?.i && cell.j === currentCells[index]?.j,
      )
    ) {
      return state;
    }

    const excludedCellsByPosition = setExcludedCellsForPosition(
      state.excludedCellsByPosition,
      position,
      nextCells,
    );

    runSync(persistExcludedCellsEffect(resolveStorage(), state.source, excludedCellsByPosition));

    return {
      ...state,
      excludedCellsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function excludeCells(position: number, cells: Iterable<GridCellCoord>) {
  viewerStore.setState((state) => {
    const nextCells = mergeExcludedCellCoords(state.excludedCellsByPosition[position] ?? [], cells);
    const currentCells = state.excludedCellsByPosition[position] ?? [];
    if (
      nextCells.length === currentCells.length &&
      nextCells.every(
        (cell, index) => cell.i === currentCells[index]?.i && cell.j === currentCells[index]?.j,
      )
    ) {
      return state;
    }

    const excludedCellsByPosition = setExcludedCellsForPosition(
      state.excludedCellsByPosition,
      position,
      nextCells,
    );

    runSync(persistExcludedCellsEffect(resolveStorage(), state.source, excludedCellsByPosition));

    return {
      ...state,
      excludedCellsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function resetExcludedCells(position: number) {
  viewerStore.setState((state) => {
    if (!(position in state.excludedCellsByPosition)) {
      return state;
    }

    const excludedCellsByPosition = setExcludedCellsForPosition(
      state.excludedCellsByPosition,
      position,
      [],
    );

    runSync(persistExcludedCellsEffect(resolveStorage(), state.source, excludedCellsByPosition));

    return {
      ...state,
      excludedCellsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}

export function applySavedAlignState(position: number, alignState: SavedAlignState | null) {
  viewerStore.setState((state) => {
    const excludedCellsByPosition = replaceExcludedCellsForPosition(
      state.excludedCellsByPosition,
      position,
      alignState?.excludedCells ?? [],
    );
    const grid = alignState ? normalizeGridState(alignState.grid) : state.grid;
    const storage = resolveStorage();

    if (alignState) {
      runSync(persistGridEffect(storage, grid));
    }
    runSync(persistExcludedCellsEffect(storage, state.source, excludedCellsByPosition));

    return {
      ...state,
      grid,
      excludedCellsByPosition,
      saveState: IDLE_SAVE_STATE,
    };
  });
}
