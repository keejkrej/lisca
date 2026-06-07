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
import { liscaSessionStorage, readStorageJson, writeStorageJson } from "@lisca/storage";
import { Atom, useAtom } from "@effect-atom/atom-react";
import { useCallback } from "react";

export type ExcludedByPosition = Record<number, AlignGridCellCoord[]>;
type StateUpdater<T> = T | ((current: T) => T);
type LoadedSavedAlignState = {
  stateKey: string;
  pos: number;
  saved: SavedAlignState | null;
};

export type StudioAlignStoreState = {
  source: AlignerSource | null;
  workspacePath: string | null;
  scan: WorkspaceScan | null;
  scanSourceKey: string | null;
  appliedAlignStateKey: string | null;
  selection: FrameRequest;
  loadedFrameSelection: FrameRequest | null;
  frame: FrameResult | null;
  contrast: ContrastWindow | null;
  grid: AlignGridState;
  toolMode: AlignGridToolMode;
  patternZoomLocked: boolean;
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
  applyLoadedFrame: (
    selection: FrameRequest,
    frame: FrameResult,
    savedAlignState: LoadedSavedAlignState | null,
  ) => void;
  setSelection: (patch: Partial<FrameRequest>) => void;
  setFrame: (frame: FrameResult | null) => void;
  setContrast: (contrast: ContrastWindow | null) => void;
  setGrid: (next: StateUpdater<AlignGridState>) => void;
  setToolMode: (mode: AlignGridToolMode) => void;
  setPatternZoomLocked: (locked: boolean) => void;
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

function scanValueOrFirst(values: number[] | undefined, preferred: number): number {
  return values?.includes(preferred) ? preferred : firstOrZero(values);
}

function resolveNextValue<T>(current: T, next: StateUpdater<T>): T {
  return typeof next === "function" ? (next as (value: T) => T)(current) : next;
}

export function sourceKey(source: AlignerSource | null): string | null {
  return source ? JSON.stringify(source) : null;
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
    loadedFrameSelection: null,
    frame: null,
    contrast: null,
    grid: normalizeAlignGridState(createDefaultAlignGrid()),
    toolMode: "pan",
    patternZoomLocked: true,
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

export const STUDIO_ALIGN_SESSION_KEY = "lisca-studio-align-session";

export type StudioAlignSessionPersist = Pick<
  StudioAlignStoreState,
  "workspacePath" | "source" | "selection"
>;

export function readStudioAlignSession(): StudioAlignSessionPersist | null {
  const parsed = readStorageJson<{ state?: StudioAlignSessionPersist }>(
    liscaSessionStorage(),
    STUDIO_ALIGN_SESSION_KEY,
  );
  if (!parsed) return null;
  return parsed.state ?? (parsed as StudioAlignSessionPersist);
}

function writeStudioAlignSession(state: StudioAlignStoreState): void {
  writeStorageJson(liscaSessionStorage(), STUDIO_ALIGN_SESSION_KEY, {
    state: {
      workspacePath: state.workspacePath,
      source: state.source,
      selection: state.selection,
    } satisfies StudioAlignSessionPersist,
  });
}

export function createInitialStudioAlignUiState(): StudioAlignStoreState {
  return createInitialState();
}

export const studioAlignUiAtom = Atom.make(createInitialState()).pipe(Atom.keepAlive);

function patchStudioAlignUi(
  set: (update: StateUpdater<StudioAlignStoreState>) => void,
  patch: Partial<StudioAlignStoreState> | ((state: StudioAlignStoreState) => StudioAlignStoreState),
): void {
  set((state) => {
    const next = typeof patch === "function" ? patch(state) : { ...state, ...patch };
    writeStudioAlignSession(next);
    return next;
  });
}

export const studioAlignUiActions = {
  setWorkspacePath(set: (update: StateUpdater<StudioAlignStoreState>) => void, workspacePath: string | null) {
    patchStudioAlignUi(set, (state) => {
      if (state.workspacePath === workspacePath) return state;
      return {
        ...state,
        workspacePath,
        appliedAlignStateKey: null,
        frame: null,
        error: null,
        status: null,
      };
    });
  },
  setSource(set: (update: StateUpdater<StudioAlignStoreState>) => void, source: AlignerSource | null) {
    patchStudioAlignUi(set, (state) => {
      if (sourceKey(state.source) === sourceKey(source)) return state;
      return {
        ...state,
        source,
        scan: null,
        scanSourceKey: null,
        appliedAlignStateKey: null,
        selection: defaultSelection,
        loadedFrameSelection: null,
        frame: null,
        contrast: null,
        grid: normalizeAlignGridState(createDefaultAlignGrid()),
        excludedCellsByPosition: {},
        error: null,
        status: source ? "Scanning source" : null,
      };
    });
  },
  applySourceScan(
    set: (update: StateUpdater<StudioAlignStoreState>) => void,
    nextSourceKey: string,
    scan: WorkspaceScan,
  ) {
    patchStudioAlignUi(set, (state) => {
      if (state.scanSourceKey === nextSourceKey) return state;
      return {
        ...state,
        scan,
        scanSourceKey: nextSourceKey,
        appliedAlignStateKey: null,
        loadedFrameSelection: null,
        selection: {
          pos: scanValueOrFirst(scan.positions, state.selection.pos),
          channel: scanValueOrFirst(scan.channels, state.selection.channel),
          time: scanValueOrFirst(scan.times, state.selection.time),
          z: scanValueOrFirst(scan.zSlices, state.selection.z),
        },
        frame: null,
        contrast: null,
        grid: createVisibleDefaultAlignGrid(),
        excludedCellsByPosition: {},
        error: null,
        status: "Source loaded",
      };
    });
  },
  applySavedAlignState(
    set: (update: StateUpdater<StudioAlignStoreState>) => void,
    stateKey: string,
    pos: number,
    saved: SavedAlignState | null,
  ) {
    patchStudioAlignUi(set, (state) => {
      if (state.appliedAlignStateKey === stateKey) return state;
      const nextExcluded = saved
        ? setExcludedAlignGridCellsForPosition(state.excludedCellsByPosition, pos, saved.excludedCells)
        : state.excludedCellsByPosition;
      return {
        ...state,
        appliedAlignStateKey: stateKey,
        grid: saved ? normalizeAlignGridState(saved.grid) : state.grid,
        excludedCellsByPosition: nextExcluded,
        status: saved ? `Loaded align/Pos${pos}.json` : state.status,
      };
    });
  },
  applyLoadedFrame(
    set: (update: StateUpdater<StudioAlignStoreState>) => void,
    loadedFrameSelection: FrameRequest,
    frame: FrameResult,
    savedAlignState: LoadedSavedAlignState | null,
  ) {
    patchStudioAlignUi(set, (state) => {
      const nextState = { ...state, loadedFrameSelection, frame, status: null };
      if (!savedAlignState || state.appliedAlignStateKey === savedAlignState.stateKey) {
        return nextState;
      }
      const nextExcluded = savedAlignState.saved
        ? setExcludedAlignGridCellsForPosition(
            state.excludedCellsByPosition,
            savedAlignState.pos,
            savedAlignState.saved.excludedCells,
          )
        : state.excludedCellsByPosition;
      return {
        ...nextState,
        appliedAlignStateKey: savedAlignState.stateKey,
        grid: savedAlignState.saved
          ? normalizeAlignGridState(savedAlignState.saved.grid)
          : state.grid,
        excludedCellsByPosition: nextExcluded,
      };
    });
  },
  setSelection(set: (update: StateUpdater<StudioAlignStoreState>) => void, patch: Partial<FrameRequest>) {
    patchStudioAlignUi(set, (state) => ({
      ...state,
      selection: { ...state.selection, ...patch },
      appliedAlignStateKey:
        patch.pos != null && patch.pos !== state.selection.pos ? null : state.appliedAlignStateKey,
    }));
  },
  setFrame(set: (update: StateUpdater<StudioAlignStoreState>) => void, frame: FrameResult | null) {
    patchStudioAlignUi(set, (state) => ({
      ...state,
      frame,
      loadedFrameSelection: frame ? state.loadedFrameSelection : null,
    }));
  },
  setContrast(set: (update: StateUpdater<StudioAlignStoreState>) => void, contrast: ContrastWindow | null) {
    patchStudioAlignUi(set, (state) => ({ ...state, contrast }));
  },
  setGrid(set: (update: StateUpdater<StudioAlignStoreState>) => void, next: StateUpdater<AlignGridState>) {
    patchStudioAlignUi(set, (state) => ({
      ...state,
      grid: normalizeAlignGridState(resolveNextValue(state.grid, next)),
    }));
  },
  setToolMode(set: (update: StateUpdater<StudioAlignStoreState>) => void, toolMode: AlignGridToolMode) {
    patchStudioAlignUi(set, (state) => ({ ...state, toolMode }));
  },
  setPatternZoomLocked(set: (update: StateUpdater<StudioAlignStoreState>) => void, patternZoomLocked: boolean) {
    patchStudioAlignUi(set, (state) => ({ ...state, patternZoomLocked }));
  },
  setExcludedCellsForCurrentPosition(
    set: (update: StateUpdater<StudioAlignStoreState>) => void,
    cells: Iterable<AlignGridCellCoord>,
  ) {
    patchStudioAlignUi(set, (state) => ({
      ...state,
      excludedCellsByPosition: setExcludedAlignGridCellsForPosition(
        state.excludedCellsByPosition,
        state.selection.pos,
        cells,
      ),
    }));
  },
  setFrameLoading(set: (update: StateUpdater<StudioAlignStoreState>) => void, frameLoading: boolean) {
    patchStudioAlignUi(set, (state) => ({ ...state, frameLoading }));
  },
  setSaving(set: (update: StateUpdater<StudioAlignStoreState>) => void, saving: boolean) {
    patchStudioAlignUi(set, (state) => ({ ...state, saving }));
  },
  setError(set: (update: StateUpdater<StudioAlignStoreState>) => void, error: string | null) {
    patchStudioAlignUi(set, (state) => ({ ...state, error }));
  },
  setStatus(set: (update: StateUpdater<StudioAlignStoreState>) => void, status: string | null) {
    patchStudioAlignUi(set, (state) => ({ ...state, status }));
  },
};

export function useStudioAlignStore(): StudioAlignStore {
  const [state, setState] = useAtom(studioAlignUiAtom);

  const setWorkspacePath = useCallback(
    (workspacePath: string | null) => studioAlignUiActions.setWorkspacePath(setState, workspacePath),
    [setState],
  );
  const setSource = useCallback(
    (source: AlignerSource | null) => studioAlignUiActions.setSource(setState, source),
    [setState],
  );
  const applySourceScan = useCallback(
    (sourceKey: string, scan: WorkspaceScan) =>
      studioAlignUiActions.applySourceScan(setState, sourceKey, scan),
    [setState],
  );
  const applySavedAlignState = useCallback(
    (stateKey: string, pos: number, saved: SavedAlignState | null) =>
      studioAlignUiActions.applySavedAlignState(setState, stateKey, pos, saved),
    [setState],
  );
  const applyLoadedFrame = useCallback(
    (
      selection: FrameRequest,
      frame: FrameResult,
      savedAlignState: LoadedSavedAlignState | null,
    ) => studioAlignUiActions.applyLoadedFrame(setState, selection, frame, savedAlignState),
    [setState],
  );
  const setSelection = useCallback(
    (patch: Partial<FrameRequest>) => studioAlignUiActions.setSelection(setState, patch),
    [setState],
  );
  const setFrame = useCallback(
    (frame: FrameResult | null) => studioAlignUiActions.setFrame(setState, frame),
    [setState],
  );
  const setContrast = useCallback(
    (contrast: ContrastWindow | null) => studioAlignUiActions.setContrast(setState, contrast),
    [setState],
  );
  const setGrid = useCallback(
    (next: StateUpdater<AlignGridState>) => studioAlignUiActions.setGrid(setState, next),
    [setState],
  );
  const setToolMode = useCallback(
    (mode: AlignGridToolMode) => studioAlignUiActions.setToolMode(setState, mode),
    [setState],
  );
  const setPatternZoomLocked = useCallback(
    (locked: boolean) => studioAlignUiActions.setPatternZoomLocked(setState, locked),
    [setState],
  );
  const setExcludedCellsForCurrentPosition = useCallback(
    (cells: Iterable<AlignGridCellCoord>) =>
      studioAlignUiActions.setExcludedCellsForCurrentPosition(setState, cells),
    [setState],
  );
  const setFrameLoading = useCallback(
    (frameLoading: boolean) => studioAlignUiActions.setFrameLoading(setState, frameLoading),
    [setState],
  );
  const setSaving = useCallback(
    (saving: boolean) => studioAlignUiActions.setSaving(setState, saving),
    [setState],
  );
  const setError = useCallback(
    (error: string | null) => studioAlignUiActions.setError(setState, error),
    [setState],
  );
  const setStatus = useCallback(
    (status: string | null) => studioAlignUiActions.setStatus(setState, status),
    [setState],
  );

  return {
    ...state,
    setWorkspacePath,
    setSource,
    applySourceScan,
    applySavedAlignState,
    applyLoadedFrame,
    setSelection,
    setFrame,
    setContrast,
    setGrid,
    setToolMode,
    setPatternZoomLocked,
    setExcludedCellsForCurrentPosition,
    setFrameLoading,
    setSaving,
    setError,
    setStatus,
  };
}
