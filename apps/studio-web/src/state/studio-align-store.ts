import type {
  AlignGridCellCoord,
  AlignGridState,
  AlignerSource,
  ContrastWindow,
  FrameRequest,
  FrameResult,
  SavedAlignState,
  WorkspaceScan,
} from "@lisca/contracts";
import {
  createDefaultAlignGrid,
  normalizeAlignGridState,
  setExcludedAlignGridCellsForPosition,
  type AlignGridToolMode,
} from "@lisca/utils";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ExcludedByPosition = Record<number, AlignGridCellCoord[]>;
type StateUpdater<T> = T | ((current: T) => T);

type StudioAlignStoreState = {
  source: AlignerSource | null;
  workspacePath: string | null;
  scan: WorkspaceScan | null;
  scanSourceKey: string | null;
  appliedAlignStateKey: string | null;
  selection: FrameRequest;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  grid: AlignGridState;
  toolMode: AlignGridToolMode;
  excludedCellsByPosition: ExcludedByPosition;
  frameLoading: boolean;
  saving: boolean;
  error: string | null;
  status: string | null;
};

type StudioAlignStoreActions = {
  setWorkspacePath: (workspacePath: string | null) => void;
  setSource: (source: AlignerSource | null) => void;
  applySourceScan: (sourceKey: string, scan: WorkspaceScan) => void;
  applySavedAlignState: (stateKey: string, pos: number, saved: SavedAlignState | null) => void;
  setSelection: (patch: Partial<FrameRequest>) => void;
  setFrame: (frame: FrameResult | null) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setGrid: (next: StateUpdater<AlignGridState>) => void;
  setToolMode: (mode: AlignGridToolMode) => void;
  setExcludedCellsForCurrentPosition: (cells: Iterable<AlignGridCellCoord>) => void;
  setFrameLoading: (frameLoading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  setStatus: (status: string | null) => void;
};

export type StudioAlignStore = StudioAlignStoreState & StudioAlignStoreActions;

const defaultSelection: FrameRequest = { pos: 0, channel: 0, time: 0, z: 0 };

function firstOrZero(values: number[] | undefined): number {
  return values?.[0] ?? 0;
}

function resolveNextValue<T>(current: T, next: StateUpdater<T>): T {
  return typeof next === "function" ? (next as (value: T) => T)(current) : next;
}

export function sourceKey(source: AlignerSource | null): string | null {
  return source ? `${source.kind}:${source.path}` : null;
}

export function savedAlignStateKey(workspacePath: string, pos: number): string {
  return `${workspacePath}:pos:${pos}`;
}

function createInitialState(): StudioAlignStoreState {
  return {
    source: null,
    workspacePath: null,
    scan: null,
    scanSourceKey: null,
    appliedAlignStateKey: null,
    selection: defaultSelection,
    frame: null,
    contrast: null,
    grid: normalizeAlignGridState(createDefaultAlignGrid()),
    toolMode: "pan",
    excludedCellsByPosition: {},
    frameLoading: false,
    saving: false,
    error: null,
    status: null,
  };
}

function createVisibleDefaultAlignGrid(): AlignGridState {
  return normalizeAlignGridState({ ...createDefaultAlignGrid(), enabled: true });
}

export const useStudioAlignStore = create<StudioAlignStore>()(
  persist(
    (set) => ({
      ...createInitialState(),
      setWorkspacePath: (workspacePath) =>
        set((state) => {
          if (state.workspacePath === workspacePath) return state;
          return {
            ...state,
            workspacePath,
            appliedAlignStateKey: null,
            frame: null,
            error: null,
            status: null,
          };
        }),
      setSource: (source) =>
        set((state) => {
          if (sourceKey(state.source) === sourceKey(source)) return state;
          return {
            ...state,
            source,
            scan: null,
            scanSourceKey: null,
            appliedAlignStateKey: null,
            selection: defaultSelection,
            frame: null,
            contrast: null,
            grid: normalizeAlignGridState(createDefaultAlignGrid()),
            excludedCellsByPosition: {},
            error: null,
            status: source ? "Scanning source" : null,
          };
        }),
      applySourceScan: (nextSourceKey, scan) =>
        set((state) => {
          if (state.scanSourceKey === nextSourceKey) return state;
          return {
            ...state,
            scan,
            scanSourceKey: nextSourceKey,
            appliedAlignStateKey: null,
            selection: {
              pos: firstOrZero(scan.positions),
              channel: firstOrZero(scan.channels),
              time: firstOrZero(scan.times),
              z: firstOrZero(scan.zSlices),
            },
            frame: null,
            contrast: null,
            grid: createVisibleDefaultAlignGrid(),
            excludedCellsByPosition: {},
            error: null,
            status: "Source loaded",
          };
        }),
      applySavedAlignState: (stateKey, pos, saved) =>
        set((state) => {
          if (state.appliedAlignStateKey === stateKey) return state;
          const nextExcluded = saved
            ? setExcludedAlignGridCellsForPosition(
                state.excludedCellsByPosition,
                pos,
                saved.excludedCells,
              )
            : state.excludedCellsByPosition;
          return {
            ...state,
            appliedAlignStateKey: stateKey,
            grid: saved ? normalizeAlignGridState(saved.grid) : state.grid,
            excludedCellsByPosition: nextExcluded,
            status: saved ? `Loaded align/Pos${pos}.json` : state.status,
          };
        }),
      setSelection: (patch) =>
        set((state) => ({
          ...state,
          selection: { ...state.selection, ...patch },
          appliedAlignStateKey:
            patch.pos != null && patch.pos !== state.selection.pos
              ? null
              : state.appliedAlignStateKey,
        })),
      setFrame: (frame) => set((state) => ({ ...state, frame })),
      setContrast: (contrast) => set((state) => ({ ...state, contrast })),
      setGrid: (next) =>
        set((state) => ({
          ...state,
          grid: normalizeAlignGridState(resolveNextValue(state.grid, next)),
        })),
      setToolMode: (toolMode) => set((state) => ({ ...state, toolMode })),
      setExcludedCellsForCurrentPosition: (cells) =>
        set((state) => ({
          ...state,
          excludedCellsByPosition: setExcludedAlignGridCellsForPosition(
            state.excludedCellsByPosition,
            state.selection.pos,
            cells,
          ),
        })),
      setFrameLoading: (frameLoading) => set((state) => ({ ...state, frameLoading })),
      setSaving: (saving) => set((state) => ({ ...state, saving })),
      setError: (error) => set((state) => ({ ...state, error })),
      setStatus: (status) => set((state) => ({ ...state, status })),
    }),
    {
      name: "lisca-studio-align-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        workspacePath: state.workspacePath,
        source: state.source,
      }),
    },
  ),
);
