import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

import type {
  FrameResult,
  SavedAlignState,
  ViewerSelection,
  ViewerSource,
  WorkspaceScan,
} from "lisca/shared/contracts";
import {
  clearExcludedCells,
  createDefaultGrid,
  mergeExcludedCells,
  normalizeGridState,
  setExcludedCellsForPosition,
  type ExcludedCellsByPosition,
  type GridCellCoord,
  type GridState,
} from "lisca/shared/core";

export type AlignSaveState =
  | { type: "idle"; message: null }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export type AlignContrastMode = "auto" | "manual";

export interface AlignStoreState {
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
  contrastMode: AlignContrastMode;
  contrastReloadToken: number;
  timeSliderIndex: number;
  excludedCellsByPosition: ExcludedCellsByPosition;
  saveState: AlignSaveState;
  saving: boolean;
}

export type AlignStore = StoreApi<AlignStoreState>;
type StateUpdater<T> = T | ((current: T) => T);

export const IDLE_ALIGN_SAVE_STATE: AlignSaveState = { type: "idle", message: null };
const DEFAULT_CONTRAST_MIN = 0;
const DEFAULT_CONTRAST_MAX = 65535;

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

export function createInitialAlignState(
  overrides: Partial<AlignStoreState> = {},
): AlignStoreState {
  return {
    workspacePath: null,
    source: null,
    scan: null,
    selection: null,
    grid: createDefaultGrid(),
    frame: null,
    loading: false,
    error: null,
    contrastMin: DEFAULT_CONTRAST_MIN,
    contrastMax: DEFAULT_CONTRAST_MAX,
    contrastMode: "manual",
    contrastReloadToken: 0,
    timeSliderIndex: 0,
    excludedCellsByPosition: {},
    saveState: IDLE_ALIGN_SAVE_STATE,
    saving: false,
    ...overrides,
  };
}

export function createAlignStore(
  initialState: Partial<AlignStoreState> = {},
): AlignStore {
  return createStore<AlignStoreState>(() => createInitialAlignState(initialState));
}

export function patchAlignState(store: AlignStore, patch: Partial<AlignStoreState>) {
  store.setState((state) => ({ ...state, ...patch }));
}

export function setAlignWorkspacePath(store: AlignStore, workspacePath: string | null) {
  store.setState((state) => ({ ...state, workspacePath }));
}

export function setAlignSource(store: AlignStore, source: ViewerSource | null) {
  store.setState((state) => ({
    ...state,
    source,
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
    excludedCellsByPosition: {},
    saveState: IDLE_ALIGN_SAVE_STATE,
    saving: false,
  }));
}

export function setAlignGrid(store: AlignStore, next: StateUpdater<GridState>) {
  store.setState((state) => ({
    ...state,
    grid: resolveNextValue(state.grid, next),
  }));
}

export function setAlignTimeSliderIndex(store: AlignStore, timeSliderIndex: number) {
  store.setState((state) => ({ ...state, timeSliderIndex }));
}

export function setAlignSaving(store: AlignStore, saving: boolean) {
  store.setState((state) => ({ ...state, saving }));
}

export function excludeAlignCells(
  store: AlignStore,
  position: number,
  cells: Iterable<GridCellCoord>,
) {
  store.setState((state) => {
    const nextCells = mergeExcludedCells(state.excludedCellsByPosition[position] ?? [], cells);
    const currentCells = state.excludedCellsByPosition[position] ?? [];
    if (
      nextCells.length === currentCells.length &&
      nextCells.every(
        (cell, index) => cell.i === currentCells[index]?.i && cell.j === currentCells[index]?.j,
      )
    ) {
      return state;
    }

    return {
      ...state,
      excludedCellsByPosition: setExcludedCellsForPosition(
        state.excludedCellsByPosition,
        position,
        nextCells,
      ),
      saveState: IDLE_ALIGN_SAVE_STATE,
    };
  });
}

export function applyAlignSavedState(
  store: AlignStore,
  position: number,
  alignState: SavedAlignState | null,
) {
  store.setState((state) => ({
    ...state,
    grid: alignState ? normalizeGridState(alignState.grid) : state.grid,
    excludedCellsByPosition: alignState
      ? replaceExcludedCellsForPosition(
          state.excludedCellsByPosition,
          position,
          alignState.excludedCells,
        )
      : clearExcludedCells(),
    saveState: IDLE_ALIGN_SAVE_STATE,
  }));
}

const AlignStoreContext = createContext<AlignStore | null>(null);

export function AlignStoreProvider({
  children,
  store,
  initialState,
}: {
  children: ReactNode;
  store?: AlignStore;
  initialState?: Partial<AlignStoreState>;
}) {
  const storeRef = useRef<AlignStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = store ?? createAlignStore(initialState);
  }

  return (
    <AlignStoreContext.Provider value={storeRef.current}>
      {children}
    </AlignStoreContext.Provider>
  );
}

export function useAlignStore<T>(selector: (state: AlignStoreState) => T): T {
  const store = useContext(AlignStoreContext);
  if (!store) {
    throw new Error("useAlignStore must be used inside AlignStoreProvider");
  }
  return useStore(store, selector);
}

export function useAlignStoreApi(): AlignStore {
  const store = useContext(AlignStoreContext);
  if (!store) {
    throw new Error("useAlignStoreApi must be used inside AlignStoreProvider");
  }
  return store;
}
